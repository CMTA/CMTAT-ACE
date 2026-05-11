**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [reentrancy-no-eth](#reentrancy-no-eth) (3 results) (Medium)
 - [uninitialized-local](#uninitialized-local) (6 results) (Medium)
 - [calls-loop](#calls-loop) (8 results) (Low)
 - [reentrancy-events](#reentrancy-events) (2 results) (Low)
 - [assembly](#assembly) (2 results) (Informational)
 - [dead-code](#dead-code) (2 results) (Informational)
 - [naming-convention](#naming-convention) (23 results) (Informational)
## reentrancy-no-eth
Impact: Medium
Confidence: Medium
 - [ ] ID-0
Reentrancy in [PolicyProtectedUpgradeable.runPolicy()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L51-L63):
	External calls:
	- [_policyProtectedStorage().policyEngine.run(IPolicyEngine.Payload({selector:msg.sig,sender:msg.sender,data:msg.data,context:context}))](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L56-L58)
	State variables written after the call(s):
	- [clearContext()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L61)
		- [$ = policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L33)
	[PolicyProtectedUpgradeable.policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28) can be used in cross function reentrancies:
	- [PolicyProtectedUpgradeable._policyProtectedStorage()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35)

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L51-L63


 - [ ] ID-1
Reentrancy in [ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120):
	External calls:
	- [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	State variables written after the call(s):
	- [clearContext()](contracts/modules/lite/ValidationModulePolicyEngine.sol#L116)
		- [$ = policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L33)
	[PolicyProtectedUpgradeable.policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28) can be used in cross function reentrancies:
	- [PolicyProtectedUpgradeable._policyProtectedStorage()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-2
Reentrancy in [PolicyProtectedUpgradeable._attachPolicyEngine(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99):
	External calls:
	- [_policyProtectedStorage().policyEngine.detach()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L90-L94)
	State variables written after the call(s):
	- [PolicyEngineDetachFailed(address(_policyProtectedStorage().policyEngine),reason)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L93)
		- [$ = policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L33)
	[PolicyProtectedUpgradeable.policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28) can be used in cross function reentrancies:
	- [PolicyProtectedUpgradeable._policyProtectedStorage()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35)
	- [_policyProtectedStorage().policyEngine = IPolicyEngine(policyEngine)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L96)
		- [$ = policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L33)
	[PolicyProtectedUpgradeable.policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28) can be used in cross function reentrancies:
	- [PolicyProtectedUpgradeable._policyProtectedStorage()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35)

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99


## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-3
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32


 - [ ] ID-4
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33


 - [ ] ID-5
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34


 - [ ] ID-6
[MintBurnExtractor.extract(IPolicyEngine.Payload).account](contracts/modules/chainlink-ace/modified/MintBurnExtractor.sol#L34) is a local variable never initialized

contracts/modules/chainlink-ace/modified/MintBurnExtractor.sol#L34


 - [ ] ID-7
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).spender](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31


 - [ ] ID-8
[MintBurnExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/modified/MintBurnExtractor.sol#L35) is a local variable never initialized

contracts/modules/chainlink-ace/modified/MintBurnExtractor.sol#L35


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-9
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134) has external calls inside a loop: [message = $.rules[i].messageForTransferRestriction(code)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L114)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134


 - [ ] ID-10
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134) has external calls inside a loop: [code = $.rules[i].detectTransferRestrictionFrom(spender,from,to,amount)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L112)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134


 - [ ] ID-11
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20BurnModule.batchBurn(address[],uint256[])
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-12
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134) has external calls inside a loop: [message_scope_5 = $.rules[i_scope_3].messageForTransferRestriction(code_scope_4)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L127)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134


 - [ ] ID-13
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchMint(address[],uint256[])
		ERC20MintModuleInternal._batchMint(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._mintOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-14
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchTransfer(address[],uint256[])
		ERC20MintModuleInternal._batchTransfer(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._minterTransferOverride(address,address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-15
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134) has external calls inside a loop: [code_scope_4 = $.rules[i_scope_3].detectTransferRestriction(from_scope_0,to_scope_1,amount_scope_2)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L125)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L94-L134


 - [ ] ID-16
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20BurnModule.batchBurn(address[],uint256[],bytes)
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


## reentrancy-events
Impact: Low
Confidence: Medium
 - [ ] ID-17
Reentrancy in [PolicyProtectedUpgradeable._attachPolicyEngine(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99):
	External calls:
	- [_policyProtectedStorage().policyEngine.detach()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L90-L94)
	Event emitted after the call(s):
	- [PolicyEngineDetachFailed(address(_policyProtectedStorage().policyEngine),reason)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L93)

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99


 - [ ] ID-18
Reentrancy in [PolicyProtectedUpgradeable._attachPolicyEngine(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99):
	External calls:
	- [_policyProtectedStorage().policyEngine.detach()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L90-L94)
	- [IPolicyEngine(policyEngine).attach()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L97)
	Event emitted after the call(s):
	- [PolicyEngineAttached(policyEngine)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L98)

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L87-L99


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-19
[PolicyProtectedUpgradeable._policyProtectedStorage()](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35) uses assembly
	- [INLINE ASM](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L32-L34)

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L30-L35


 - [ ] ID-20
[TransferValidationPolicy._getStorage()](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L37-L41) uses assembly
	- [INLINE ASM](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L38-L40)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L37-L41


## dead-code
Impact: Informational
Confidence: Medium
 - [ ] ID-21
[CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133) is never used and should be removed

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133


 - [ ] ID-22
[PolicyProtectedUpgradeable.__PolicyProtected_init(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L37-L40) is never used and should be removed

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L37-L40


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-23
Parameter [CCTCMTATBaseERC20CrossChain.supportsInterface(bytes4)._interfaceId](contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L104) is not in mixedCase

contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L104


 - [ ] ID-24
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ExtraInformationAttributes_](contracts/modules/standard/CCTCommon.sol#L91) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L91


 - [ ] ID-25
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L138) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L138


 - [ ] ID-26
Function [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L85-L112) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L85-L112


 - [ ] ID-27
Function [PolicyProtectedUpgradeable.__PolicyProtected_init(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L37-L40) is not in mixedCase

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L37-L40


 - [ ] ID-28
Parameter [CCTCommon.supportsInterface(bytes4)._interfaceId](contracts/modules/standard/CCTCommon.sol#L202) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L202


 - [ ] ID-29
Function [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L117-L122) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L117-L122


 - [ ] ID-30
Function [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L137-L153) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L137-L153


 - [ ] ID-31
Function [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133


 - [ ] ID-32
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L129) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L129


 - [ ] ID-33
Parameter [CCTCMTATBasePolicyEngine.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L45) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L45


 - [ ] ID-34
Parameter [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L121) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L121


 - [ ] ID-35
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ExtraInformationModuleAttributes_](contracts/modules/standard/CCTCommon.sol#L139) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L139


 - [ ] ID-36
Function [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643)](contracts/modules/standard/CCTCommon.sol#L88-L115) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L88-L115


 - [ ] ID-37
Parameter [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L131) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L131


 - [ ] ID-38
Constant [PolicyProtectedUpgradeable.policyProtectedStorageLocation](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28) is not in UPPER_CASE_WITH_UNDERSCORES

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L27-L28


 - [ ] ID-39
Function [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L130-L135) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L130-L135


 - [ ] ID-40
Function [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/standard/CCTCommon.sol#L120-L125) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L120-L125


 - [ ] ID-41
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L118) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L118


 - [ ] ID-42
Parameter [CCTCommon.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L51) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L51


 - [ ] ID-43
Function [PolicyProtectedUpgradeable.__PolicyProtected_init_unchained(address)](contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L42-L44) is not in mixedCase

contracts/modules/chainlink-ace/modified/PolicyProtectedUpgradeable.sol#L42-L44


 - [ ] ID-44
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L90) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L90


 - [ ] ID-45
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L87) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L87


