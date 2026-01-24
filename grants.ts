let ledger: Array<{ amount: number; timestamp: number; expiration_timestamp: number }> = [];
// could be separate costs and grants

function add_grant(amount: number, timestamp: number, expiration_timestamp: number) {
  ledger.push({ amount, timestamp, expiration_timestamp });
}

function add_cost(amount: number, timestamp: number) {
  ledger.push({ amount: -amount, timestamp, expiration_timestamp: 0 });
}

function get_balance(atTimestamp: number) {
  // sorted in ascending expiration timestamp
  const grants = ledger
    .filter(({ amount, timestamp }) => amount > 0 && timestamp <= atTimestamp)
    .sort((a, b) => a.expiration_timestamp - b.expiration_timestamp);
  // sorted by ascending timestamp
  const costs = ledger
    .filter(({ amount, timestamp }) => amount < 0 && timestamp <= atTimestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  console.log(grants);
  console.log(costs);

  for (let c = 0; c < costs.length; c++) {
    const cost = costs[c];

    // go through the grants
    // check if the grant is available when this cost is applied (start timestamp and expiration timestamp)
    // reduce grant if grant has overhead
    let remainingCost = -cost.amount;
    for (let i = 0; i < grants.length; i++) {
      let grant = grants[i];
      if (grant.timestamp > cost.timestamp || grant.expiration_timestamp < cost.timestamp) {
        continue;
      }
      if (grant.amount === 0) {
        continue;
      }
      if (grant.amount >= remainingCost) {
        grants[i] = {
          amount: grant.amount - remainingCost,
          timestamp: grant.timestamp,
          expiration_timestamp: grant.expiration_timestamp,
        };
        remainingCost = 0;
        break;
      } else {
        remainingCost = remainingCost - grant.amount;
        grants[i] = {
          amount: 0,
          timestamp: grant.timestamp,
          expiration_timestamp: grant.expiration_timestamp,
        };
      }
    }

    console.log(`processed cost`, cost, ` and result is ${remainingCost}`);
    console.log(`processed cost and result is `, grants);
    if (remainingCost > 0) {
      return null;
    }
  }

  return grants.reduce((acc, grant) => {
    if (grant.expiration_timestamp >= atTimestamp) {
      return acc + grant.amount;
    }
    return acc;
  }, 0);
}

add_grant(10, 10, 100);
add_grant(10, 0, 5);
add_grant(5, 0, 9);
add_cost(7, 7);
add_cost(6, 1);
console.log(get_balance(8)); // should return None
console.log(get_balance(4)); // should return 4
console.log(get_balance(14)); // should return 4
