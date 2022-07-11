const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");
const { plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
// On Ethereum the circuits need to run on a finite field with this prime number:
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// Creating the field with Ethereum's prime number.
const Fr = new F1Field(exports.p);

describe("HelloWorld", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        // Getting and deploying the Verifier Contract on a local Ethereum test
        // network set up by hardhat.
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Circuit should multiply two numbers correctly", async function () {
        // Creating the circuit from the circom file to later calculate a
        // witness. Outside of tests one would create a wasm file (or c++).
        const circuit = await wasm_tester("contracts/circuits/HelloWorld.circom");

        // Providing private inputs for the circuit.
        const INPUT = {
            "a": 2,
            "b": 3
        }

        // Calculating the witness.
        const witness = await circuit.calculateWitness(INPUT, true);

        // Checking that the output (second element in witness) is 6 (because
        // 2 * 3 should be 6). Unfortunately I could not find out what the first
        // element means and why it is supposed to be 1.
        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(6)));
    });

    it("Should return true for correct proof", async function () {
        // To generate a proof that one knows two numbers whose product is 6
        // one needs to provide the private inputs (2 and 3), the wasm file so
        // that the public output can be computed (6) and the zkey which
        // contains Proving Key and Verification Key needed for the proof.
        // The variable publicSignals is an array containing all the public
        // signals (in this case on 6) and the proof will contain all the data
        // which is needed to call the verifyProof function of the smart
        // contract and some meta data (like protocol and curve).
        const { proof, publicSignals } = await groth16.fullProve({"a":"2","b":"3"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");

        // The following line extracts all the parameters needed for the smart
        // contract only, without all the meta information and converts from
        // plain integers to hex.
        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

        // Splits the string containing all the parameters into an array (argv)
        // and converts from BigInt to String.
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        // Groups the parameters to match the smart contracts definition:
        // uint[2] memory a,
        // uint[2][2] memory b,
        // uint[2] memory c,
        // uint[1] memory input
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        // Verifies the proof and expects it to be true. (Completeness)
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        // Using some dummy values that cannot possibly hold the equation.
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0];
        // With these nonsense values the proof should obviously fail. (Soundness)
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {

    beforeEach(async function () {
      Verifier = await ethers.getContractFactory("Multiplier3Verifier");
      verifier = await Verifier.deploy();
      await verifier.deployed();
    });

    it("Circuit should multiply three numbers correctly", async function () {
      const circuit = await wasm_tester("contracts/circuits/Multiplier3.circom");

      const INPUT = {
          "a": 2,
          "b": 3,
          "c": 4
      }

      const witness = await circuit.calculateWitness(INPUT, true);

      assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
      // Here we have an intermediate result (out_1 <== a * b) that we should
      // also check (2 * 3 should be 6).
      assert(Fr.eq(Fr.e(witness[1]),Fr.e(6)));
      assert(Fr.eq(Fr.e(witness[2]),Fr.e(24)));
    });

    it("Should return true for correct proof", async function () {
      const { proof, publicSignals } = await groth16.fullProve({"a":"2","b":"3","c":"4"}, "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3/circuit_final.zkey");

      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

      const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
      const c = [argv[6], argv[7]];
      const Input = argv.slice(8);

      expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
      let a = [0, 0];
      let b = [[0, 0], [0, 0]];
      let c = [0, 0];
      let d = [0, 0];

      expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {

    beforeEach(async function () {
      Verifier = await ethers.getContractFactory("PlonkVerifier");
      verifier = await Verifier.deploy();
      await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
      const { proof, publicSignals } = await plonk.fullProve({"a":"2","b":"3","c":"4"}, "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3_plonk/circuit_final.zkey");

      const calldata = await plonk.exportSolidityCallData(proof, publicSignals);

      const argv = calldata.replace(/["[\]\s]/g, "").split(',');

      // The PLONK verifier contract takes only two inputs: the first is the
      // proof (p) and the second is an array of public signals (pubSignals).
      // The proof stays in hex format only the arguments will be converted to
      // string.
      const p = argv[0];
      const pubSignals = argv.slice(1).map(x => BigInt(x).toString());

      expect(await verifier.verifyProof(p, pubSignals)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        let p = 0x00;
        let pubSignals = [0, 0];

        expect(await verifier.verifyProof(p, pubSignals)).to.be.false;
    });
});
