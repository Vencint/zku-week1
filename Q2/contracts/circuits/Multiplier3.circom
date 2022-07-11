pragma circom 2.0.0;

// [assignment] Modify the circuit below to perform a multiplication of three signals

template Multiplier3 () {

   // Declaration of signals.
   signal input a;
   signal input b;
   signal input c;
   signal output out_1; // for intermediate result
   signal output d;

   // Constraints.
   out_1 <== a * b;
   d <== out_1 * c;
}

component main = Multiplier3();
