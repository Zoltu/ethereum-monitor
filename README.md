Gather block/transaction statistics and pipe them to InfluxDB for query and (optionally) graphing (via Grafana).

## Fancy Grafana Charts
![image](https://user-images.githubusercontent.com/886059/47424648-b2e45f00-d7ba-11e8-8207-0a8e2912f3fb.png)
```sql
SELECT "gas_price_nanoeth" FROM "transaction" WHERE time >= now() - 15m
```

![image](https://user-images.githubusercontent.com/886059/47424765-0e165180-d7bb-11e8-84eb-c5a34fa7450c.png)
```sql
SELECT sum("gas_cost_total_eth") AS "total_fees_paid" FROM "transaction" WHERE time >= now() - 15m GROUP BY time(1s) fill(previous)
```

![image](https://user-images.githubusercontent.com/886059/47424826-31410100-d7bb-11e8-8235-0144a261ef44.png)
```sql
SELECT last("number") AS "number", last("since_previous_block_seconds") AS "time_since_last_block" FROM "block" WHERE time >= now() - 15m GROUP BY time(1s) fill(previous)
```

![image](https://user-images.githubusercontent.com/886059/47425128-fbe8e300-d7bb-11e8-909c-5d2bd27a0ec9.png)
```sql
SELECT percentile("since_previous_block_seconds", 50) AS "50%", percentile("since_previous_block_seconds", 75) AS "75%", percentile("since_previous_block_seconds", 90) AS "90%", percentile("since_previous_block_seconds", 98) AS "98%", percentile("since_previous_block_seconds", 99) AS "99%", percentile("since_previous_block_seconds", 99.9) AS "99.9%" FROM "block" WHERE time >= now() - 24h
```

![image](https://user-images.githubusercontent.com/886059/47425640-8bdb5c80-d7bd-11e8-8349-d6ac0497d8b4.png)
```sql
SELECT "since_previous_block_seconds" FROM "block" WHERE time >= now() - 24h
```
