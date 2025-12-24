#!/usr/bin/env python3
"""
Claude Token Counter
Analyzes Claude conversation logs to count token usage and costs.
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def parse_usage(usage_obj):
    """Parse usage object, return input, output, cache write, and cache read tokens."""
    if not usage_obj:
        return 0, 0, 0, 0

    input_tokens = usage_obj.get("input_tokens", 0)
    output_tokens = usage_obj.get("output_tokens", 0)
    cache_write_input_tokens = usage_obj.get("cache_creation_input_tokens", 0)
    cache_read_input_tokens = usage_obj.get("cache_read_input_tokens", 0)

    return (
        input_tokens,
        output_tokens,
        cache_write_input_tokens,
        cache_read_input_tokens,
    )


def load_pricing(csv_path=None):
    """Load model pricing from CSV file."""
    if csv_path is None:
        # Use the script directory
        script_dir = Path(__file__).parent
        csv_path = script_dir / "model-cost.csv"

    pricing = {}

    if not csv_path.exists():
        return pricing

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            model = row["model"]
            pricing[model] = {
                "input_price_per_1m": float(row.get("input_price_per_1m", 0)),
                "output_price_per_1m": float(row.get("output_price_per_1m", 0)),
                "cache_read_price_per_1m": float(row.get("cache_read_price_per_1m", 0)),
                "cache_write_price_per_1m": float(
                    row.get("cache_write_price_per_1m", 0)
                ),
            }

    return pricing


def calculate_cost(tokens, price_per_1m):
    """Calculate cost - simple calculation."""
    if price_per_1m == 0 or tokens == 0:
        return 0.0

    return (tokens / 1_000_000) * price_per_1m


def analyze_jsonl_file(file_path):
    """Analyze a single JSONL file and return token statistics."""
    stats = {
        "by_model": defaultdict(
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
            }
        ),
        "by_date": defaultdict(
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
            }
        ),
        "by_date_and_model": defaultdict(  # Track which model used on which date
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
            }
        ),
        "total": {
            "input": 0,
            "output": 0,
            "cache_write": 0,
            "cache_read": 0,
            "messages": 0,
        },
        "sessions": set(),
        # Store raw entries with requestIds for deduplication later
        "entries": [],
    }

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    data = json.loads(line)

                    # Only count assistant messages with usage
                    if data.get("type") != "assistant":
                        continue

                    message = data.get("message", {})
                    usage = message.get("usage", {})
                    request_id = data.get("requestId")

                    # Skip if no usage
                    if not usage:
                        continue

                    (
                        input_tokens,
                        output_tokens,
                        cache_write_tokens,
                        cache_read_tokens,
                    ) = parse_usage(usage)

                    # Skip if no tokens
                    if (
                        input_tokens == 0
                        and output_tokens == 0
                        and cache_write_tokens == 0
                        and cache_read_tokens == 0
                    ):
                        continue

                    model = message.get("model", "unknown")
                    timestamp_str = data.get("timestamp", "")

                    # Parse date from timestamp
                    try:
                        timestamp = datetime.fromisoformat(
                            timestamp_str.replace("Z", "+00:00")
                        )
                        date_key = timestamp.strftime("%Y-%m-%d")
                    except:
                        date_key = "unknown"

                    session_id = data.get("sessionId")

                    # Store entry for later deduplication
                    stats["entries"].append(
                        {
                            "request_id": request_id,
                            "model": model,
                            "date_key": date_key,
                            "input_tokens": input_tokens,
                            "output_tokens": output_tokens,
                            "cache_write_tokens": cache_write_tokens,
                            "cache_read_tokens": cache_read_tokens,
                            "session_id": session_id,
                        }
                    )

                except json.JSONDecodeError:
                    continue

    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)

    return stats


def scan_claude_projects(claude_dir=None):
    """Scan all JSONL files in Claude projects directory."""
    if claude_dir is None:
        claude_dir = Path.home() / ".claude" / "projects"
    else:
        claude_dir = Path(claude_dir)

    if not claude_dir.exists():
        print(f"Claude projects directory not found: {claude_dir}", file=sys.stderr)
        return []

    jsonl_files = list(claude_dir.rglob("*.jsonl"))
    return jsonl_files


def calculate_stats_costs(aggregated, pricing):
    """Calculate costs for each model and date based on pricing."""
    # First, calculate costs by model
    for model, data in aggregated["by_model"].items():
        if model in pricing:
            model_pricing = pricing[model]

            # Calculate input cost
            input_cost = calculate_cost(
                data["input"], model_pricing["input_price_per_1m"]
            )

            # Calculate output cost
            output_cost = calculate_cost(
                data["output"], model_pricing["output_price_per_1m"]
            )

            # Calculate cache write cost
            cache_write_cost = calculate_cost(
                data["cache_write"], model_pricing["cache_write_price_per_1m"]
            )

            # Calculate cache read cost
            cache_read_cost = calculate_cost(
                data["cache_read"], model_pricing["cache_read_price_per_1m"]
            )

            # Total cost for this model
            data["cost"] = input_cost + output_cost + cache_write_cost + cache_read_cost
        else:
            data["cost"] = 0.0

    # Calculate total cost by model
    total_cost = sum(data["cost"] for data in aggregated["by_model"].values())
    aggregated["total"]["cost"] = total_cost

    # Calculate costs by date
    if pricing:
        for date, data in aggregated["by_date"].items():
            date_cost = 0.0
            # Sum up costs for each model on this date
            for model in aggregated["by_model"].keys():
                date_model_key = (date, model)
                if date_model_key in aggregated["by_date_and_model"]:
                    dm_data = aggregated["by_date_and_model"][date_model_key]
                    if model in pricing:
                        model_pricing = pricing[model]
                        # Calculate cost for this model on this date
                        input_cost = calculate_cost(
                            dm_data["input"], model_pricing["input_price_per_1m"]
                        )
                        output_cost = calculate_cost(
                            dm_data["output"], model_pricing["output_price_per_1m"]
                        )
                        cache_write_cost = calculate_cost(
                            dm_data["cache_write"],
                            model_pricing["cache_write_price_per_1m"],
                        )
                        cache_read_cost = calculate_cost(
                            dm_data["cache_read"],
                            model_pricing["cache_read_price_per_1m"],
                        )
                        date_cost += (
                            input_cost
                            + output_cost
                            + cache_write_cost
                            + cache_read_cost
                        )
            data["cost"] = date_cost

    return aggregated


def aggregate_stats(all_stats):
    """Aggregate statistics from multiple files with global requestId deduplication."""
    aggregated = {
        "by_model": defaultdict(
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
                "cost": 0.0,
            }
        ),
        "by_date": defaultdict(
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
                "cost": 0.0,
            }
        ),
        "by_date_and_model": defaultdict(
            lambda: {
                "input": 0,
                "output": 0,
                "cache_write": 0,
                "cache_read": 0,
                "messages": 0,
            }
        ),
        "total": {
            "input": 0,
            "output": 0,
            "cache_write": 0,
            "cache_read": 0,
            "messages": 0,
            "cost": 0.0,
        },
        "sessions": set(),
    }

    # Global requestId deduplication across all files
    processed_request_ids = set()

    # Collect all entries from all files
    all_entries = []
    for stats in all_stats:
        all_entries.extend(stats["entries"])
        aggregated["sessions"].update(stats["sessions"])

    # Process entries with deduplication
    for entry in all_entries:
        request_id = entry["request_id"]

        # Skip if we've already processed this requestId
        if request_id and request_id in processed_request_ids:
            continue

        # Mark this requestId as processed
        if request_id:
            processed_request_ids.add(request_id)

        # Extract fields
        model = entry["model"]
        date_key = entry["date_key"]
        input_tokens = entry["input_tokens"]
        output_tokens = entry["output_tokens"]
        cache_write_tokens = entry["cache_write_tokens"]
        cache_read_tokens = entry["cache_read_tokens"]
        session_id = entry["session_id"]

        # Update stats
        aggregated["by_model"][model]["input"] += input_tokens
        aggregated["by_model"][model]["output"] += output_tokens
        aggregated["by_model"][model]["cache_write"] += cache_write_tokens
        aggregated["by_model"][model]["cache_read"] += cache_read_tokens
        aggregated["by_model"][model]["messages"] += 1

        aggregated["by_date"][date_key]["input"] += input_tokens
        aggregated["by_date"][date_key]["output"] += output_tokens
        aggregated["by_date"][date_key]["cache_write"] += cache_write_tokens
        aggregated["by_date"][date_key]["cache_read"] += cache_read_tokens
        aggregated["by_date"][date_key]["messages"] += 1

        date_model_key = (date_key, model)
        aggregated["by_date_and_model"][date_model_key]["input"] += input_tokens
        aggregated["by_date_and_model"][date_model_key]["output"] += output_tokens
        aggregated["by_date_and_model"][date_model_key]["cache_write"] += (
            cache_write_tokens
        )
        aggregated["by_date_and_model"][date_model_key]["cache_read"] += (
            cache_read_tokens
        )
        aggregated["by_date_and_model"][date_model_key]["messages"] += 1

        aggregated["total"]["input"] += input_tokens
        aggregated["total"]["output"] += output_tokens
        aggregated["total"]["cache_write"] += cache_write_tokens
        aggregated["total"]["cache_read"] += cache_read_tokens
        aggregated["total"]["messages"] += 1

        if session_id:
            aggregated["sessions"].add(session_id)

    return aggregated


def format_number(num):
    """Format large numbers with commas."""
    return f"{num:,}"


def print_stats(stats, pricing=None):
    """Print formatted statistics."""
    total = stats["total"]
    total_cache = total["cache_write"] + total["cache_read"]
    total_tokens = total["input"] + total["output"] + total_cache

    print("=" * 70)
    print("Claude Token Usage Summary")
    print("=" * 70)
    print()

    # Overall summary
    print(f"Total Sessions: {format_number(len(stats['sessions']))}")
    print(f"Total Messages: {format_number(total['messages'])}")
    print()
    print(f"Input Tokens:     {format_number(total['input']):>12}")
    print(f"Output Tokens:    {format_number(total['output']):>12}")
    print(f"Cache Write:      {format_number(total['cache_write']):>12}")
    print(f"Cache Read:       {format_number(total['cache_read']):>12}")
    print(f"Total Cache:      {format_number(total_cache):>12}")
    print(f"Total Tokens:     {format_number(total_tokens):>12}")

    if pricing:
        total_cost = total.get("cost", 0.0)
        print(f"Total Cost:        ${total_cost:>10.2f}")
    print()

    # By model
    if stats["by_model"]:
        print("-" * 70)
        print("Usage by Model")
        print("-" * 70)

        if pricing:
            print(
                f"{'Model':<30} {'Input':>9} {'Output':>9} {'CWrite':>9} {'CRead':>9} {'Tokens':>9} {'Cost':>10} {'Msgs':>5}"
            )
        else:
            print(
                f"{'Model':<30} {'Input':>10} {'Output':>10} {'CWrite':>10} {'CRead':>10} {'Total':>12} {'Msgs':>5}"
            )
        print("-" * 70)

        sorted_models = sorted(
            stats["by_model"].items(),
            key=lambda x: x[1]["input"]
            + x[1]["output"]
            + x[1]["cache_write"]
            + x[1]["cache_read"],
            reverse=True,
        )

        for model, data in sorted_models:
            model_cache = data["cache_write"] + data["cache_read"]
            model_total = data["input"] + data["output"] + model_cache

            if pricing:
                cost = data.get("cost", 0.0)
                print(
                    f"{model[:30]:<30} "
                    f"{format_number(data['input']):>9} "
                    f"{format_number(data['output']):>9} "
                    f"{format_number(data['cache_write']):>9} "
                    f"{format_number(data['cache_read']):>9} "
                    f"{format_number(model_total):>9} "
                    f"${cost:>9.2f} "
                    f"{data['messages']:>5}"
                )
            else:
                print(
                    f"{model[:30]:<30} "
                    f"{format_number(data['input']):>10} "
                    f"{format_number(data['output']):>10} "
                    f"{format_number(data['cache_write']):>10} "
                    f"{format_number(data['cache_read']):>10} "
                    f"{format_number(model_total):>12} "
                    f"{data['messages']:>5}"
                )
        print()

    # By date
    if stats["by_date"]:
        print("-" * 70)
        print("Usage by Date")
        print("-" * 70)

        if pricing:
            print(
                f"{'Date':<12} {'Input':>10} {'Output':>10} {'CWrite':>10} {'CRead':>10} {'Total':>10} {'Cost':>10} {'Msgs':>5}"
            )
        else:
            print(
                f"{'Date':<12} {'Input':>10} {'Output':>10} {'CWrite':>10} {'CRead':>10} {'Total':>12} {'Msgs':>5}"
            )
        print("-" * 70)

        sorted_dates = sorted(stats["by_date"].items(), key=lambda x: x[0])

        for date, data in sorted_dates:
            date_cache = data["cache_write"] + data["cache_read"]
            date_total = data["input"] + data["output"] + date_cache

            if pricing:
                cost = data.get("cost", 0.0)
                print(
                    f"{date:<12} "
                    f"{format_number(data['input']):>10} "
                    f"{format_number(data['output']):>10} "
                    f"{format_number(data['cache_write']):>10} "
                    f"{format_number(data['cache_read']):>10} "
                    f"{format_number(date_total):>10} "
                    f"${cost:>9.2f} "
                    f"{data['messages']:>5}"
                )
            else:
                print(
                    f"{date:<12} "
                    f"{format_number(data['input']):>10} "
                    f"{format_number(data['output']):>10} "
                    f"{format_number(data['cache_write']):>10} "
                    f"{format_number(data['cache_read']):>10} "
                    f"{format_number(date_total):>12} "
                    f"{data['messages']:>5}"
                )
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Count Claude tokens from conversation logs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Count all tokens with costs
  %(prog)s --model claude-3-5-sonnet # Filter by model
  %(prog)s --json                    # Output as JSON
  %(prog)s --claude-dir ~/.claude    # Custom Claude directory
  %(prog)s --no-cost                 # Skip cost calculation
  %(prog)s --pricing custom.csv      # Use custom pricing file
        """,
    )
    parser.add_argument(
        "--claude-dir",
        type=str,
        help="Path to Claude projects directory (default: ~/.claude/projects)",
    )
    parser.add_argument(
        "--model",
        type=str,
        help="Filter by model name (partial match)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )
    parser.add_argument(
        "--pricing",
        type=str,
        help="Path to model pricing CSV file",
    )
    parser.add_argument(
        "--no-cost",
        action="store_true",
        help="Skip cost calculation",
    )

    args = parser.parse_args()

    # Load pricing
    pricing = {}
    if not args.no_cost:
        print(f"Loading pricing information...", file=sys.stderr)
        pricing = load_pricing(args.pricing)
        if pricing:
            print(f"Loaded pricing for {len(pricing)} models.", file=sys.stderr)
        else:
            print(
                f"No pricing data found. Costs will not be calculated.", file=sys.stderr
            )

    # Scan for JSONL files
    print(f"Scanning Claude conversation logs...", file=sys.stderr)
    jsonl_files = scan_claude_projects(args.claude_dir)

    if not jsonl_files:
        print("No JSONL files found.", file=sys.stderr)
        return 0

    print(f"Found {len(jsonl_files)} conversation files.", file=sys.stderr)

    # Analyze all files
    all_stats = []
    for file_path in jsonl_files:
        stats = analyze_jsonl_file(file_path)
        all_stats.append(stats)

    # Aggregate statistics
    aggregated = aggregate_stats(all_stats)

    # Calculate costs if pricing is available
    if pricing:
        aggregated = calculate_stats_costs(aggregated, pricing)

    # Filter by model if requested
    if args.model:
        filtered_models = {
            k: v
            for k, v in aggregated["by_model"].items()
            if args.model.lower() in k.lower()
        }

        if not filtered_models:
            print(f"No matches for model: {args.model}", file=sys.stderr)
            return 0

        # Recalculate totals based on filtered models
        filtered_total = {
            "input": sum(v["input"] for v in filtered_models.values()),
            "output": sum(v["output"] for v in filtered_models.values()),
            "cache_write": sum(v["cache_write"] for v in filtered_models.values()),
            "cache_read": sum(v["cache_read"] for v in filtered_models.values()),
            "messages": sum(v["messages"] for v in filtered_models.values()),
            "cost": sum(v.get("cost", 0) for v in filtered_models.values()),
        }

        aggregated = {
            "by_model": filtered_models,
            "by_date": aggregated["by_date"],  # Keep all dates
            "total": filtered_total,
            "sessions": aggregated["sessions"],
        }

    # Output results
    if args.json:
        # Convert defaultdicts to regular dicts for JSON serialization
        output = {
            "by_model": dict(aggregated["by_model"]),
            "by_date": dict(aggregated["by_date"]),
            "total": aggregated["total"],
            "sessions_count": len(aggregated["sessions"]),
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        print_stats(aggregated, pricing if not args.no_cost else None)

    return 0


if __name__ == "__main__":
    sys.exit(main())
