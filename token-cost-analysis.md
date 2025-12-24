# Token Usage Cost Analysis

## Daily Usage Data (2025-12-24)

| Metric | Value |
|--------|-------|
| Input Tokens | 2,111 |
| Output Tokens | 3,473 |
| CWrite Tokens | 201,917 |
| CRead Tokens | 326,718 |
| **Total Tokens** | **534,219** |
| **Cost** | **$0.91** |
| Messages | 17 |

## Cost Analysis Scenarios

### Scenario 1: Current Daily Usage (Based on $0.90/day)

**Per Computer:**
- Daily: $0.90
- Monthly (33 days): $0.90 × 33 = **$29.70**
- Tokens per month: 534,219 × 33 = ~17.6M tokens

**4 Computers:**
- Daily: $0.90 × 4 = $3.60
- Monthly: $0.90 × 33 × 4 = **$118.80**
- Tokens per month: 17.6M × 4 = ~70.5M tokens

### Scenario 2: Claude Code Pro $140/Month

**Budget Breakdown:**
- Monthly: $140
- Weekly: $140 ÷ 4 = **$35**
- Daily: $35 ÷ 7 = **$5**

**Token Budget:**
- Monthly tokens: $140 × 587,057 = ~82.2M tokens
- Weekly tokens: $35 × 587,057 = ~20.5M tokens
- Daily tokens: $5 × 587,057 = ~2.9M tokens

### Scenario 3: 3% of Monthly Budget

**Per Computer:**
- 3% of $140 = $4.20 per month
- Daily: $4.20 ÷ 33 = **$0.13**
- Weekly: $4.20 ÷ 4 = **$1.05**

**4 Computers:**
- Monthly: $4.20 × 4 = **$16.80**
- Daily: $0.13 × 4 = **$0.52**
- Weekly: $1.05 × 4 = **$4.20**

## Comparison

| Scenario | Daily Cost | Monthly Cost | Token Budget |
|----------|------------|--------------|--------------|
| Current usage (1 computer) | $0.90 | $29.70 | ~17.6M tokens/month |
| Current usage (4 computers) | $3.60 | $118.80 | ~70.5M tokens/month |
| Claude Code Pro | $5.00 | $140.00 | ~82.2M tokens/month |
| 3% budget (4 computers) | $0.52 | $16.80 | ~9.9M tokens/month |

## Key Findings

1. **Current usage vs Claude Code Pro**: Your 4-computer usage ($118.80/month) is well within the Claude Code Pro budget ($140/month), leaving $21.20/month unused

2. **Actual token efficiency**: $0.90 = 534,219 tokens, so $1 = ~593,577 tokens

3. **Usage intensity**:
   - Current daily usage (4 computers): 3.6M tokens/day
   - Claude Code Pro daily limit: 2.9M tokens/day
   - Your usage exceeds Claude Code Pro daily limit by 24%

4. **Recommendation**:
   - With current usage patterns, you'd exceed Claude Code Pro's daily limits even though you're within the monthly budget
   - OpenRouter provides flexibility without daily/time restrictions
   - Your 4-computer setup would cost $118.80/month on OpenRouter vs $140/month on Claude Code Pro (15% savings)
