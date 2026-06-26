# Slither Report — v0.3.0 (mocks INCLUDED in scope)

> Command: `slither . --checklist --filter-paths "node_modules,submodules,test,forge-std"` (Slither 0.11.5).
> Assessment: [`slither-report-feedback.md`](./slither-report-feedback.md). Overview: [`doc/audits/AUDIT_OVERVIEW.md`](../../../AUDIT_OVERVIEW.md).

## Summary

**0 High · 11 Medium · 10 Low · 21 Informational** — **no High findings; nothing to fix** (all false-positive / by-design / mock-inclusion / style).

| Detector | Severity | Instances | Assessment |
| --- | --- | --- | --- |
| `uninitialized-local` | Medium | 11 | **False positive** — extractor locals (`from`/`to`/…) are assigned per selector branch; intentional zero-defaults (mint `from = 0`, burn `to = 0`). |
| `calls-loop` | Low | 10 | **By design** — policy / rule chains iterate over external calls (`TransferValidationPolicy` over `IRule`s, engine over policies). |
| `assembly` | Informational | 1 | **Expected** — ERC-7201 namespaced-storage slot pointer (`$.slot := STORAGE_LOCATION`). |
| `naming-convention` | Informational | 18 | **Style only.** |
| `unused-state` | Informational | 2 | **False positive** — `CCTCommon.CAN_SEND_SELECTOR` / `CAN_RECEIVE_SELECTOR` ARE used by `canSend`/`canReceive`; flagged only because the in-scope `CanSendReceiveOverrideMock` overrides those views (mock-inclusion artifact of `-m`). |

---

**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [uninitialized-local](#uninitialized-local) (11 results) (Medium)
 - [calls-loop](#calls-loop) (10 results) (Low)
 - [assembly](#assembly) (1 results) (Informational)
 - [naming-convention](#naming-convention) (18 results) (Informational)
 - [unused-state](#unused-state) (2 results) (Informational)
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
[MintBurnExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L41) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L41


 - [ ] ID-6
[MintBurnExtractor.extract(IPolicyEngine.Payload).to](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L42) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L42


 - [ ] ID-7
[CrossChainMintBurnExtractor.extract(IPolicyEngine.Payload).from](contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L48) is a local variable never initialized

contracts/modules/chainlink-ace/custom/CrossChainMintBurnExtractor.sol#L48


 - [ ] ID-8
[MintBurnExtractor.extract(IPolicyEngine.Payload).account](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L39) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L39


 - [ ] ID-9
[ERC20TransferFromExtractor.extract(IPolicyEngine.Payload).spender](contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31) is a local variable never initialized

contracts/modules/chainlink-ace/custom/ERC20TransferFromExtractor.sol#L31


 - [ ] ID-10
[MintBurnExtractor.extract(IPolicyEngine.Payload).amount](contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L40) is a local variable never initialized

contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol#L40


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-11
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150) has external calls inside a loop: [code_scope_4 = $.rules[i_scope_3].detectTransferRestriction(from_scope_0,to_scope_1,amount_scope_2)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L138)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150


 - [ ] ID-12
[TransferValidationPolicy.postRun(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L163-L195) has external calls inside a loop: [$.rules[i_scope_3].transferred(from_scope_0,to_scope_1,amount_scope_2)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L190)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L163-L195


 - [ ] ID-13
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150) has external calls inside a loop: [message_scope_5 = $.rules[i_scope_3].messageForTransferRestriction(code_scope_4)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L140)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150


 - [ ] ID-14
[TransferValidationPolicy.postRun(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L163-L195) has external calls inside a loop: [$.rules[i].transferred(spender,from,to,amount)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L181)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L163-L195


 - [ ] ID-15
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		CCTCMTATBaseERC20CrossChain.batchBurn(address[],uint256[],bytes)
		ERC20BurnModule.batchBurn(address[],uint256[],bytes)
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CMTATBaseCommon._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-16
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		CCTCMTATBaseERC20CrossChain.batchMint(address[],uint256[])
		ERC20MintModule.batchMint(address[],uint256[])
		ERC20MintModuleInternal._batchMint(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._mintOverride(address,uint256)
		CMTATBaseCommon._mintOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-17
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150) has external calls inside a loop: [code = $.rules[i].detectTransferRestrictionFrom(spender,from,to,amount)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L125)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150


 - [ ] ID-18
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		CCTCMTATBaseERC20CrossChain.batchTransfer(address[],uint256[])
		ERC20MintModule.batchTransfer(address[],uint256[])
		ERC20MintModuleInternal._batchTransfer(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._minterTransferOverride(address,address,uint256)
		CMTATBaseCommon._minterTransferOverride(address,address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-19
[ValidationModulePolicyEngine._transferred(address,address,address,uint256)](contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120) has external calls inside a loop: [policyEngine_.run(IPolicyEngine.Payload({selector:msg.sig,sender:_msgSender(),data:msg.data,context:context}))](contracts/modules/lite/ValidationModulePolicyEngine.sol#L112-L114)
	Calls stack containing the loop:
		CCTCMTATBaseERC20CrossChain.batchBurn(address[],uint256[])
		ERC20BurnModule.batchBurn(address[],uint256[])
		ERC20BurnModuleInternal._batchBurn(address[],uint256[])
		CCTCMTATBaseERC20CrossChain._burnOverride(address,uint256)
		CMTATBaseCommon._burnOverride(address,uint256)
		CCTCMTATBasePolicyEngine._checkTransferred(address,address,address,uint256)

contracts/modules/lite/ValidationModulePolicyEngine.sol#L102-L120


 - [ ] ID-20
[TransferValidationPolicy.run(address,address,bytes4,bytes[],bytes)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150) has external calls inside a loop: [message = $.rules[i].messageForTransferRestriction(code)](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L127)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L107-L150


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-21
[TransferValidationPolicy._getStorage()](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L41-L45) uses assembly
	- [INLINE ASM](contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L42-L44)

contracts/modules/chainlink-ace/custom/TransferValidationPolicy.sol#L41-L45


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-22
Parameter [CCTCMTATBaseERC20CrossChain.supportsInterface(bytes4)._interfaceId](contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L205) is not in mixedCase

contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol#L205


 - [ ] ID-23
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L111) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L111


 - [ ] ID-24
Parameter [CCTCommon.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L48) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L48


 - [ ] ID-25
Parameter [CCTCommon.supportsInterface(bytes4)._interfaceId](contracts/modules/standard/CCTCommon.sol#L175) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L175


 - [ ] ID-26
Function [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L92-L97) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L92-L97


 - [ ] ID-27
Function [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L110-L126) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L110-L126


 - [ ] ID-28
Parameter [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L94) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L94


 - [ ] ID-29
Parameter [CCTCommon.__CMTAT_commonModules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ExtraInformationModuleAttributes_](contracts/modules/standard/CCTCommon.sol#L112) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L112


 - [ ] ID-30
Parameter [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L104) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L104


 - [ ] ID-31
Function [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address)](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L66-L87) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L66-L87


 - [ ] ID-32
Function [CCTCommon.__CMTAT_modules_init_unchained(ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes)](contracts/modules/standard/CCTCommon.sol#L103-L108) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L103-L108


 - [ ] ID-33
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ExtraInformationAttributes_](contracts/modules/standard/CCTCommon.sol#L70) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L70


 - [ ] ID-34
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L68) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L68


 - [ ] ID-35
Parameter [CCTCMTATBasePolicyEngine.initialize(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L44) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L44


 - [ ] ID-36
Parameter [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address).ERC20Attributes_](contracts/modules/standard/CCTCommon.sol#L69) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L69


 - [ ] ID-37
Function [CCTCommon.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes)](contracts/modules/standard/CCTCommon.sol#L93-L98) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L93-L98


 - [ ] ID-38
Parameter [CCTCMTATBasePolicyEngine.__CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes).ERC20Attributes_](contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L93) is not in mixedCase

contracts/modules/lite/CCTCMTATBasePolicyEngine.sol#L93


 - [ ] ID-39
Function [CCTCommon.__CMTAT_init(address,ICMTATConstructor.ERC20Attributes,ICMTATConstructor.ExtraInformationAttributes,address)](contracts/modules/standard/CCTCommon.sol#L67-L88) is not in mixedCase

contracts/modules/standard/CCTCommon.sol#L67-L88


## unused-state
Impact: Informational
Confidence: High
 - [ ] ID-40
[CCTCommon.CAN_RECEIVE_SELECTOR](contracts/modules/standard/CCTCommon.sol#L196) is never used in [CanSendReceiveOverrideMock](contracts/modules/chainlink-ace/mocks/CanSendReceiveOverrideMock.sol#L17-L43)

contracts/modules/standard/CCTCommon.sol#L196


 - [ ] ID-41
[CCTCommon.CAN_SEND_SELECTOR](contracts/modules/standard/CCTCommon.sol#L194) is never used in [CanSendReceiveOverrideMock](contracts/modules/chainlink-ace/mocks/CanSendReceiveOverrideMock.sol#L17-L43)

contracts/modules/standard/CCTCommon.sol#L194


