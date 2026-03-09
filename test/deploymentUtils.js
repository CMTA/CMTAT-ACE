const { ethers, upgrades } = require('hardhat')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

const ZERO_ADDRESS = ethers.ZeroAddress
const DEPLOYMENT_DECIMAL = 0n
const TERMS = [
  'doc1',
  'https://example.com/doc1',
  '0x6a12eff2f559a5e529ca2c563c53194f6463ed5c61d1ae8f8731137467ab0279'
]

// Role constants (match CMTAT convention)
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'))
const BURNER_FROM_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_FROM_ROLE'))
const BURNER_SELF_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_SELF_ROLE'))
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE'))
const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ENFORCER_ROLE'))
const ERC20ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ERC20ENFORCER_ROLE'))
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

/**
 * Fixture matching CMTAT signer convention
 */
async function fixture () {
  const [
    _,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  ] = await ethers.getSigners()
  return {
    _,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  }
}

/* ======== ACE Infrastructure Deploy Helpers ======== */

async function deployPolicyEngine (defaultAllow, initialOwner) {
  const Factory = await ethers.getContractFactory('PolicyEngine')
  const policyEngine = await upgrades.deployProxy(
    Factory,
    [defaultAllow, initialOwner],
    { initializer: 'initialize', unsafeAllow: ['constructor'], silenceWarnings: true }
  )
  return policyEngine
}

async function deployPausePolicy (policyEngineAddress, ownerAddress, initiallyPaused = false) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const configParams = abiCoder.encode(['bool'], [initiallyPaused])
  const Factory = await ethers.getContractFactory('PausePolicy')
  const pausePolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    { initializer: 'initialize', unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'], silenceWarnings: true }
  )
  return pausePolicy
}

async function deployRBACPolicy (policyEngineAddress, ownerAddress) {
  const Factory = await ethers.getContractFactory('RoleBasedAccessControlPolicy')
  const rbacPolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, '0x'],
    { initializer: 'initialize', unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'], silenceWarnings: true }
  )
  return rbacPolicy
}

/* ======== Standard Contract Deploy Helpers ======== */

async function deployCCTStandalone (forwarder, admin, policyEngineAddress) {
  const cmtat = await ethers.deployContract(
    'ComplianceTokenCMTATStandalone',
    [
      forwarder,
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ]
  )
  return cmtat
}

async function deployCCTUpgradeable (forwarder, admin, policyEngineAddress) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATUpgradeable')
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarder],
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true
    }
  )
  return cmtat
}

/* ======== Lite Contract Deploy Helpers ======== */

async function deployCCTLiteStandalone (forwarder, admin, policyEngineAddress) {
  const cmtat = await ethers.deployContract(
    'ComplianceTokenCMTATLiteStandalone',
    [
      forwarder,
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ]
  )
  return cmtat
}

async function deployCCTLiteUpgradeable (forwarder, admin, policyEngineAddress) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATLiteUpgradeable')
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarder, admin, ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL], ['CMTAT_ISIN', TERMS, 'CMTAT_info'], policyEngineAddress],
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true
    }
  )
  return cmtat
}

/* ======== UUPS Contract Deploy Helpers ======== */

async function deployCCTUUPSUpgradeable (forwarder, admin, policyEngineAddress) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATUUPSUpgradeable')
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarder],
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
      kind: 'uups'
    }
  )
  return cmtat
}

async function deployCCTLiteUUPSUpgradeable (forwarder, admin, policyEngineAddress) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATLiteUUPSUpgradeable')
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarder],
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
      kind: 'uups'
    }
  )
  return cmtat
}

module.exports = {
  ZERO_ADDRESS,
  DEPLOYMENT_DECIMAL,
  TERMS,
  MINTER_ROLE,
  BURNER_ROLE,
  BURNER_FROM_ROLE,
  BURNER_SELF_ROLE,
  PAUSER_ROLE,
  ENFORCER_ROLE,
  ERC20ENFORCER_ROLE,
  DEFAULT_ADMIN_ROLE,
  fixture,
  loadFixture,
  deployPolicyEngine,
  deployPausePolicy,
  deployRBACPolicy,
  deployCCTStandalone,
  deployCCTUpgradeable,
  deployCCTUUPSUpgradeable,
  deployCCTLiteStandalone,
  deployCCTLiteUpgradeable,
  deployCCTLiteUUPSUpgradeable
}
