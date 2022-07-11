pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

template RangeProof(n) {
    assert(n <= 252);
    signal input in; // this is the number to be proved inside the range
    signal input range[2]; // the two elements should be the range, i.e. [lower bound, upper bound]
    signal output out;

    assert(range[0] <= range[1]); // making sure we don't have to deal with any nonsense

    component lt = LessEqThan(n);
    component gt = GreaterEqThan(n);

    lt.in[0] <== in;
    lt.in[1] <== range[1];

    gt.in[0] <== in;
    gt.in[1] <== range[0];

    out <== lt.out + gt.out - 1;  // because we checked that lower bound is less
                                  // than or equal to upper bound we can assure
                                  // that at least lt or gt will pass so lt + gt
                                  // will always be exactly 1 or 2
                                  // logic: 0 for fail, 1 for pass
}
