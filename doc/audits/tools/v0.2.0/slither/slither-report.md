**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [uninitialized-local](#uninitialized-local) (11 results) (Medium)
 - [calls-loop](#calls-loop) (8 results) (Low)
 - [assembly](#assembly) (1 results) (Informational)
 - [dead-code](#dead-code) (1 results) (Informational)
 - [naming-convention](#naming-convention) (20 results) (Informational)
## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-0
[CrossChainMintBurnExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L49) is a local variable never initialized

contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L49


 - [ ] ID-1
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L32


 - [ ] ID-2
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L33


 - [ ] ID-3
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L34


 - [ ] ID-4
[CrossChainMintBurnExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L50) is a local variable never initialized

contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L50


 - [ ] ID-5
[MintBurnExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L38) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L38


 - [ ] ID-6
[MintBurnExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L39) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L39


 - [ ] ID-7
[CrossChainMintBurnExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L48) is a local variable never initialized

contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L48


 - [ ] ID-8
[MintBurnExtractor.extract(IPolicyEngine.Payload).account](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L36) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L36


 - [ ] ID-9
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).spender](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31


 - [ ] ID-10
[MintBurnExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L37) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L37


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-11
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139) has external calls inside a loop: [code_scope_4 = $.rules[i_scope_3].detectTransferRestriction(from_scope_0,to_scope_1,amount_scope_2)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L127)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139


 - [ ] ID-12
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139) has external calls inside a loop: [message_scope_5 = $.rules[i_scope_3].messageForTransferRestriction(code_scope_4)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L129)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139


 - [ ] ID-13
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139) has external calls inside a loop: [code = $.rules[i].detectTransferRestrictionFrom(spender,from,to,amount)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L114)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139


 - [ ] ID-14
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20BurnModule.batchBurn(address[],uint256[])
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-15
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchMint(address[],uint256[])
		ERC20MintModuleInternal._batchMint(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._mintOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-16
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139) has external calls inside a loop: [message = $.rules[i].messageForTransferRestriction(code)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L116)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L96-L139


 - [ ] ID-17
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		ERC20MintModule.batchTransfer(address[],uint256[])
		ERC20MintModuleInternal._batchTransfer(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._minterTransferOverride(address,address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-18
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
 - [ ] ID-19
[TransferValidationPolicy._getStorage()](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L39-L43) uses assembly
	- [INLINE ASM](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L40-L42)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L39-L43


## dead-code
Impact: Informational
Confidence: Medium
 - [ ] ID-20
[CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L99-L105) is never used and should be removed

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L99-L105


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-21
Parameter [CCTCMTATBaseERC20CrossChain.supportsInterface(bytes4)._interfaceId](contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L98) is not in mixedCase

contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L98


 - [ ] ID-22
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L108) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L108


 - [ ] ID-23
Parameter [CCTCommon.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L45) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L45


 - [ ] ID-24
Parameter [CCTCommon.supportsInterface(bytes4)._interfaceId](contracts/modules/standard/CCTCommon.sol#L172) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L172


 - [ ] ID-25
Function [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L89-L94) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L89-L94


 - [ ] ID-26
Function [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L107-L123) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L107-L123


 - [ ] ID-27
Function [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L99-L105) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L99-L105


 - [ ] ID-28
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_modules_init_unchained(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L101) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L101


 - [ ] ID-29
Parameter [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L91) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L91


 - [ ] ID-30
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ExtraInformationModuleAttributes_](contracts/modules/standard/CCTCommon.sol#L109) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L109


 - [ ] ID-31
Parameter [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L101) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L101


 - [ ] ID-32
Function [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L63-L84) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L63-L84


 - [ ] ID-33
Function [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L100-L105) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L100-L105


 - [ ] ID-34
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ExtraInformationAttributes_](contracts/modules/standard/CCTCommon.sol#L67) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L67


 - [ ] ID-35
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L65) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L65


 - [ ] ID-36
Parameter [CCTCMTATBasePolicyEngine.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L41) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L41


 - [ ] ID-37
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L66) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L66


 - [ ] ID-38
Function [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/standard/CCTCommon.sol#L90-L95) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L90-L95


 - [ ] ID-39
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L90) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L90


 - [ ] ID-40
Function [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address)](contracts/modules/standard/CCTCommon.sol#L64-L85) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L64-L85


