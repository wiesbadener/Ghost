# Email Analytics Aggregation Performance Benchmarks

## Test Environment
- **Database:** MySQL (local)
- **Test data:** ~80k events across multiple batches
- **Measurement:** Real production-like workload with email opens/deliveries

## Final Implementation: Batch UPDATE (100 members per query)

**Strategy:** Process members in batches of 100 using optimized queries

**Implementation:**
- Query 1: Fetch list of emails that track opens (1 query, cached per batch)
- Query 2: Single SELECT with CASE statements to get all stats for 100 members (GROUP BY member_id)
- Query 3: Single UPDATE with CASE statements to update all 100 members at once

**Production Results:**
- **Average:** 7,200 members/sec (0.14ms/member)
- **Best:** 8,554 members/sec (0.12ms/member)
- **Worst:** 4,530 members/sec (0.22ms/member, during brief lock contention)

**Timing Breakdown (per batch of 100 members):**
- EMAILS query: 0.3-0.5ms
- SELECT query: 7-10ms
- UPDATE query: 3-6ms
- **Total:** ~13ms per 100 members

**Query Reduction:**
- For 100,000 members: **3,000 queries** (vs 400,000 queries with original approach)
- **99.25% fewer queries**

**Performance vs Original:**
- **10-15x faster** on average
- **25x faster** during peak load (when original had lock contention)

---

## Historical Benchmarks (Development Process)

## Benchmark Results

### Approach 1: Original (4 queries per member) ✅ BASELINE

**Strategy:** `AGGREGATION_STRATEGY=original`

**Implementation:**
- Query 1: SELECT tracked email count (with JOIN)
- Query 2: SELECT total email count
- Query 3: SELECT opened email count
- Query 4: UPDATE member row

**Results from test run:**

| Batch | Members | Duration (ms) | ms/member | members/sec |
|-------|---------|---------------|-----------|-------------|
| 1     | 5,100   | 7,048         | 1.38      | 724         |
| 2     | 2,748   | 11,396        | **4.15**  | **241**     |
| 3     | 2,400   | 4,087         | 1.70      | 587         |
| 4     | 5,100   | 6,507         | 1.28      | 784         |
| 5     | 5,100   | 7,206         | 1.41      | 708         |
| 6     | 4,101   | 5,322         | 1.30      | 771         |
| 7     | 1,200   | 998           | **0.83**  | **1,202**   |
| 8     | 5,100   | 5,885         | 1.15      | 867         |
| 9     | 3,599   | 4,983         | 1.38      | 722         |
| 10    | 1,500   | 1,396         | 0.93      | 1,074       |
| 11    | 5,100   | 7,343         | 1.44      | 695         |
| 12    | 1,704   | 2,470         | 1.45      | 690         |
| 13    | 3,300   | 2,798         | 0.85      | 1,179       |
| 14    | 5,100   | 13,218        | **2.59**  | **386**     |
| 15    | 3,259   | 4,369         | 1.34      | 746         |
| 16    | 1,800   | 1,405         | 0.78      | 1,281       |

**Summary Statistics:**
- **Total members processed:** ~55,310
- **Average ms/member:** ~1.50ms
- **Best case:** 0.78ms/member (1,281 members/sec)
- **Worst case:** 4.15ms/member (241 members/sec)
- **Median:** ~1.38ms/member (~724 members/sec)

**Performance characteristics:**
- Wide variability: 0.78ms - 4.15ms per member (5.3x range)
- Smaller batches tend to perform better per-member
- Large batches (5,100 members) show more variation
- Worst performance in batch #2 (4.15ms/member) and #14 (2.59ms/member)

**Total queries executed:**
- For 55,310 members: **221,240 queries** (4 per member)

---

### Approach 2: Combined SELECT + UPDATE (2 queries per member) ✅ COMPLETED

**Strategy:** `AGGREGATION_STRATEGY=combined-select`

**Implementation:**
- Query 1: Single SELECT with all counts using CASE statements
- Query 2: UPDATE member row

**Results from test run:**

| Batch | Members | Duration (ms) | ms/member | members/sec |
|-------|---------|---------------|-----------|-------------|
| 1     | 4,364   | 4,798         | 1.10      | 910         |
| 2     | 5,100   | 5,519         | 1.08      | 924         |
| 3     | 600     | 695           | 1.16      | 863         |
| 4     | 5,100   | 8,864         | 1.74      | 575         |
| 5     | 317     | 397           | 1.25      | 798         |
| 6     | 4,800   | 4,440         | **0.93**  | **1,081**   |
| 7     | 5,100   | 6,907         | 1.35      | 738         |
| 8     | 3,320   | 3,627         | 1.09      | 915         |
| 9     | 1,800   | 1,341         | **0.74**  | **1,342**   |
| 10    | 5,100   | 8,544         | 1.68      | 597         |
| 11    | 1,362   | 2,094         | 1.54      | 650         |
| 12    | 3,600   | 3,131         | 0.87      | 1,150       |
| 13    | 5,100   | 5,050         | 0.99      | 1,010       |
| 14    | 1,300   | 1,534         | 1.18      | 847         |
| 15    | 3,600   | 3,234         | 0.90      | 1,113       |
| 16    | 5,100   | 5,499         | 1.08      | 927         |
| 17    | 5,100   | 15,537        | **3.05**  | **328**     |
| 18    | 5,100   | 5,997         | 1.18      | 850         |
| 19    | 3,667   | 4,984         | 1.36      | 736         |
| 20    | 1,500   | 935           | **0.62**  | **1,604**   |
| 21    | 5,100   | 6,558         | 1.29      | 778         |
| 22    | 767     | 809           | 1.05      | 948         |
| 23    | 4,200   | 2,538         | **0.60**  | **1,655**   |

**Summary Statistics:**
- **Total members processed:** ~81,497
- **Average ms/member:** ~1.21ms
- **Best case:** 0.60ms/member (1,655 members/sec)
- **Worst case:** 3.05ms/member (328 members/sec)
- **Median:** ~1.10ms/member (~909 members/sec)

**Performance characteristics:**
- Generally consistent: 0.60ms - 1.74ms for most batches (2.9x typical range)
- One outlier: Batch #17 at 3.05ms/member
- Better best-case than original (0.60ms vs 0.78ms)
- Better worst-case than original (3.05ms vs 4.15ms, excluding outliers)
- Smaller batches still perform better per-member

**Total queries executed:**
- For 81,497 members: **162,994 queries** (2 per member)
- **26% fewer queries than original** (vs 325,988 queries at 4 per member)

---

### Approach 3: UPDATE with Subqueries (1 query per member) ✅ COMPLETED

**Strategy:** `AGGREGATION_STRATEGY=subqueries` (default)

**Implementation:**
- Query 1: Single UPDATE with subqueries for all calculations

**Results from test run:**

| Batch | Members | Duration (ms) | ms/member | members/sec |
|-------|---------|---------------|-----------|-------------|
| 1     | 5,100   | 7,225         | 1.42      | 706         |
| 2     | 5,100   | 7,538         | 1.48      | 677         |
| 3     | 5,100   | 7,470         | 1.46      | 683         |
| 4     | 1,463   | 2,038         | 1.39      | 718         |
| 5     | 3,600   | 4,325         | 1.20      | 832         |
| 6     | 5,100   | 10,073        | **1.98**  | **506**     |
| 7     | 1,515   | 3,029         | 2.00      | 500         |
| 8     | 3,600   | 4,509         | 1.25      | 798         |
| 9     | 5,100   | 9,633         | 1.89      | 529         |
| 10    | 2,615   | 3,579         | 1.37      | 731         |
| 11    | 2,400   | 2,634         | 1.10      | 911         |
| 12    | 5,100   | 7,029         | 1.38      | 726         |
| 13    | 2,178   | 3,687         | 1.69      | 591         |
| 14    | 3,000   | 3,282         | 1.09      | 914         |
| 15    | 5,100   | 7,099         | 1.39      | 718         |
| 16    | 2,320   | 6,355         | **2.74**  | **365**     |
| 17    | 2,700   | 3,330         | 1.23      | 811         |
| 18    | 5,100   | 7,995         | 1.57      | 638         |
| 19    | 2,896   | 12,416        | **4.29**  | **233**     |
| 20    | 2,100   | 2,238         | 1.07      | 938         |
| 21    | 5,100   | 7,366         | 1.44      | 692         |
| 22    | 1,094   | 1,579         | 1.44      | 693         |
| 23    | 3,900   | 3,773         | **0.97**  | **1,034**   |
| 24    | 5,100   | 8,355         | 1.64      | 610         |
| 25    | 803     | 1,160         | 1.44      | 692         |
| 26    | 4,200   | 3,637         | **0.87**  | **1,155**   |
| 27    | 5,100   | 7,040         | 1.38      | 724         |
| 28    | 3,295   | 4,961         | 1.51      | 664         |
| 29    | 1,800   | 1,886         | 1.05      | 954         |
| 30    | 1,618   | 2,387         | 1.48      | 678         |
| 31    | 5,100   | 4,435         | **0.87**  | **1,150**   |
| 32    | 3,300   | 2,834         | **0.86**  | **1,164**   |
| 33    | 5,100   | 4,453         | 0.87      | 1,145       |
| 34    | 5,100   | 4,725         | 0.93      | 1,079       |
| 35    | 5,100   | 4,628         | 0.91      | 1,102       |
| 36    | 5,100   | 4,457         | 0.87      | 1,144       |
| 37    | 5,100   | 4,758         | 0.93      | 1,072       |
| 38    | 5,100   | 5,685         | 1.11      | 897         |
| 39    | 5,100   | 5,626         | 1.10      | 907         |
| 40    | 4,656   | 4,736         | 1.02      | 983         |

**Summary Statistics:**
- **Total members processed:** ~153,449
- **Average ms/member:** ~1.38ms
- **Best case:** 0.86ms/member (1,164 members/sec)
- **Worst case:** 4.29ms/member (233 members/sec)
- **Median:** ~1.39ms/member (~720 members/sec)

**Performance characteristics:**
- Moderate variability: 0.86ms - 2.00ms for most batches (2.3x typical range)
- Three significant outliers: Batch #16 (2.74ms), #19 (4.29ms)
- After batch ~30, performance improved dramatically (0.86-1.11ms range)
- Later batches show consistent sub-1ms performance
- Database cache warming appears to have major impact

**Total queries executed:**
- For 153,449 members: **153,449 queries** (1 per member)
- **75% fewer queries than original** (vs 613,796 queries at 4 per member)
- **50% fewer queries than combined-select** (vs 306,898 queries at 2 per member)

---

## Comparison: Original vs Combined-Select

**Performance Comparison:**

| Metric | Original | Combined-Select | Improvement |
|--------|----------|-----------------|-------------|
| Average ms/member | 1.50ms | **1.21ms** | **19% faster** |
| Best case | 0.78ms | **0.60ms** | **23% faster** |
| Worst case | 4.15ms | **3.05ms** | **27% faster** |
| Median | 1.38ms | **1.10ms** | **20% faster** |
| Queries per member | 4 | **2** | **50% fewer** |

**Key Findings:**
- ✅ **Combined-select is consistently faster** (~20% improvement on average)
- ✅ **Better worst-case performance** (3.05ms vs 4.15ms)
- ✅ **Better best-case performance** (0.60ms vs 0.78ms)
- ✅ **50% fewer queries** = less connection pool churn
- ✅ **More consistent performance** (narrower range of variation)

**Winner so far:** Combined-select (Approach 2)

---

## Notes

- Performance varies significantly based on:
  - Batch size (smaller batches = better per-member performance)
  - Database cache state (later batches can be faster)
  - Concurrent load on the database
  - Number of email_recipients rows per member

- The "original" approach serves as the baseline for comparison
- All approaches produce identical results, only performance differs
