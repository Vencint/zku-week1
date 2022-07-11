const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/
const verifierRegex = /contract Verifier/
const solidityFileRegex = /\.sol/


fs.readdirSync("./contracts").forEach(fileName => {
  if (solidityFileRegex.test(fileName)) {
    let name = fileName.substring(0, fileName.length - 4);
    let content = fs.readFileSync(`./contracts/${fileName}`, { encoding: 'utf-8' });
    let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
    bumped = bumped.replace(verifierRegex, `contract ${name}Verifier`);

    fs.writeFileSync(`./contracts/${fileName}`, bumped);
  }
});


/*
let content = fs.readFileSync("./contracts/HelloWorldVerifier.sol", { encoding: 'utf-8' });
let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
bumped = bumped.replace(verifierRegex, 'contract HelloWorldVerifier');

fs.writeFileSync("./contracts/HelloWorldVerifier.sol", bumped);
*/
