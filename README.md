# CMTAT ACE integration project

## Deployment versions*
Two versions are available; *lite* version which substitutes RuleEngine with Chainlink ACE PolicyEngine, and *standard* version, which uses PolicyEngine to protect all external functions instead of OpenZepplin role-based AccessControl.

## Initialize submodules
```shell
git submodule update
```

## Install dependencies
You can use any package manager either npm, yarn or pnpm. For example you can type:

```shell
npm install
```

## Compile contracts
To compile

```shell
npx hardhat compile
```

# Testing

To run tests:

```shell
npx hardhat test
```

# Scripts
You can use example scripts to deploy, e.g. for local Hardhat Network deployment:

```shell
npx hardhat run scripts/{script_name}
```