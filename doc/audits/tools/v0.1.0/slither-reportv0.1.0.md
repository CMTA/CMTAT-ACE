**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [uninitialized-local](#uninitialized-local) (6 results) (Medium)
 - [calls-loop](#calls-loop) (8 results) (Low)
 - [assembly](#assembly) (1 results) (Informational)
 - [dead-code](#dead-code) (1 results) (Informational)
 - [naming-convention](#naming-convention) (20 results) (Informational)
## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-0
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32


 - [ ] ID-1
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33


 - [ ] ID-2
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34


 - [ ] ID-3
[MintBurnExtractor.extract(IPolicyEngine.Payload).account](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L34) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L34


 - [ ] ID-4
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).spender](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31


 - [ ] ID-5
[MintBurnExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L35) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L35


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-6
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140) has external calls inside a loop: [code = $.rules[i].detectTransferRestrictionFrom(spender,from,to,amount)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L118)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140


 - [ ] ID-7
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140) has external calls inside a loop: [code_scope_4 = $.rules[i_scope_3].detectTransferRestriction(from_scope_0,to_scope_1,amount_scope_2)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L131)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140


 - [ ] ID-8
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140) has external calls inside a loop: [message_scope_5 = $.rules[i_scope_3].messageForTransferRestriction(code_scope_4)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L133)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140


 - [ ] ID-9
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140) has external calls inside a loop: [message = $.rules[i].messageForTransferRestriction(code)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L120)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L140


 - [ ] ID-10
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20BurnModule.batchBurn(address[],uint256[])
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-11
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchMint(address[],uint256[])
		ERC20MintModuleInternal._batchMint(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._mintOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-12
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchTransfer(address[],uint256[])
		ERC20MintModuleInternal._batchTransfer(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._minterTransferOverride(address,address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-13
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20BurnModule.batchBurn(address[],uint256[],bytes)
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-14
[TransferValidationPolicy._getStorage()](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L39-L43) uses assembly
	- [INLINE ASM](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L40-L42)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L39-L43


## dead-code
Impact: Informational
Confidence: Medium
 - [ ] ID-15
[CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133) is never used and should be removed

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-16
Parameter [CCTCMTATBaseERC20CrossChain.supportsInterface(bytes4)._interfaceId](contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L104) is not in mixedCase

contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L104


 - [ ] ID-17
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ExtraInformationAttributes_](contracts/modules/standard/CCTCommon.sol#L91) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L91


 - [ ] ID-18
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L138) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L138


 - [ ] ID-19
Function [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L85-L112) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L85-L112


 - [ ] ID-20
Parameter [CCTCommon.supportsInterface(bytes4)._interfaceId](contracts/modules/standard/CCTCommon.sol#L202) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L202


 - [ ] ID-21
Function [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L117-L122) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L117-L122


 - [ ] ID-22
Function [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L137-L153) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L137-L153


 - [ ] ID-23
Function [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L127-L133


 - [ ] ID-24
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L129) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L129


 - [ ] ID-25
Parameter [CCTCMTATBasePolicyEngine.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L45) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L45


 - [ ] ID-26
Parameter [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L121) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L121


 - [ ] ID-27
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ExtraInformationModuleAttributes_](contracts/modules/standard/CCTCommon.sol#L139) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L139


 - [ ] ID-28
Function [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643)](contracts/modules/standard/CCTCommon.sol#L88-L115) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L88-L115


 - [ ] ID-29
Parameter [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L131) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L131


 - [ ] ID-30
Function [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L130-L135) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L130-L135


 - [ ] ID-31
Function [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/standard/CCTCommon.sol#L120-L125) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L120-L125


 - [ ] ID-32
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L118) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L118


 - [ ] ID-33
Parameter [CCTCommon.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L51) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L51


 - [ ] ID-34
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L90) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L90


 - [ ] ID-35
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address,ISnapshotEngine,IERC1643).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L87) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L87


