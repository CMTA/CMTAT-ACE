const { expect } = require('chai')
const { deployCCTStandalone } = require('../../deploymentUtils')

const ZERO_ADDRESS = ethers.ZeroAddress

function DocumentModuleCommon () {
  context('Document Engine Module', function () {
    beforeEach(async function () {
      this.documentEngineMock = await ethers.deployContract('DocumentEngineMock')

      if ((await this.cmtat.documentEngine()) === ZERO_ADDRESS) {
        await this.cmtat
          .connect(this.admin)
          .setDocumentEngine(this.documentEngineMock.target)
      }
    })

    it('testCanSetAndGetADocument', async function () {
      const name = ethers.encodeBytes32String('doc1')
      const uri = 'https://github.com/CMTA/CMTAT'
      const documentHash = ethers.encodeBytes32String('hash1')

      await this.documentEngineMock.setDocument({ name, uri, documentHash })

      const doc = await this.cmtat.getDocument(name)
      expect(doc.uri).to.equal(uri)
      expect(doc.documentHash).to.equal(documentHash)
      expect(doc.lastModified).to.be.gt(0)
    })

    it('testCanUpdateADocument', async function () {
      const name = ethers.encodeBytes32String('doc1')
      const uri1 = 'https://github.com/CMTA/CMTAT'
      const documentHash1 = ethers.encodeBytes32String('hash1')

      const uri2 = 'https://github.com/CMTA/CMTAT/V2'
      const documentHash2 = ethers.encodeBytes32String('hash2')

      await this.documentEngineMock.setDocument([name, uri1, documentHash1])
      await this.documentEngineMock.setDocument([name, uri2, documentHash2])

      const doc = await this.cmtat.getDocument(name)
      expect(doc.uri).to.equal(uri2)
      expect(doc.documentHash).to.equal(documentHash2)
      expect(doc.lastModified).to.be.gt(0)
    })

    it('testCanGetNullValueIfNoDocument', async function () {
      const name = ethers.encodeBytes32String('nonexistent')
      const doc = await this.cmtat.getDocument(name)
      expect(doc.uri).to.equal('')
      expect(doc.documentHash).to.equal(ethers.encodeBytes32String(''))
      expect(doc.lastModified).to.equal(0)
    })

    it('testCanRemoveADocument', async function () {
      const name = ethers.encodeBytes32String('doc1')
      const uri = 'https://github.com/CMTA/CMTAT'
      const documentHash = ethers.encodeBytes32String('hash1')

      await this.documentEngineMock.setDocument([name, uri, documentHash])
      await this.documentEngineMock.removeDocument(name)

      const doc = await this.cmtat.getDocument(name)
      expect(doc.uri).to.equal('')
      expect(doc.documentHash).to.equal(ethers.encodeBytes32String(''))
      expect(doc.lastModified).to.equal(0)
    })

    it('testCanReturnAllDocumentNames', async function () {
      const name1 = ethers.encodeBytes32String('doc1')
      const uri1 = 'https://github.com/CMTA/CMTAT'
      const documentHash1 = ethers.encodeBytes32String('hash1')

      const name2 = ethers.encodeBytes32String('doc2')
      const uri2 = 'https://github.com/CMTA/CMTAT/V2'
      const documentHash2 = ethers.encodeBytes32String('hash2')

      await this.documentEngineMock.setDocument([name1, uri1, documentHash1])
      await this.documentEngineMock.setDocument([name2, uri2, documentHash2])

      const documentNames = await this.cmtat.getAllDocuments()
      expect(documentNames.length).to.equal(2)
      expect(documentNames).to.include(name1)
      expect(documentNames).to.include(name2)
    })

    it('testCanSetDocumentEngine', async function () {
      const newDocEngineMock = await ethers.deployContract('DocumentEngineMock')
      this.logs = await this.cmtat
        .connect(this.admin)
        .setDocumentEngine(newDocEngineMock.target)
      await expect(this.logs)
        .to.emit(this.cmtat, 'DocumentEngine')
        .withArgs(newDocEngineMock.target)
      expect(await this.cmtat.documentEngine()).to.equal(newDocEngineMock.target)
    })

    it('testCannotSetDocumentEngineWithSameValue', async function () {
      await expect(
        this.cmtat
          .connect(this.admin)
          .setDocumentEngine(await this.cmtat.documentEngine())
      ).to.be.revertedWithCustomError(
        this.cmtat,
        'CMTAT_DocumentEngineModule_SameValue'
      )
    })

    it('testGetEmptyDocumentsIfNoDocumentEngine', async function () {
      // Deploy a fresh token with no document engine
      const policyEngineAddress = await this.policyEngine.getAddress()
      const freshCmtat = await deployCCTStandalone(
        ethers.ZeroAddress,
        this.admin.address,
        policyEngineAddress
      )

      const name = ethers.encodeBytes32String('doc1')
      const doc = await freshCmtat.getDocument(name)
      expect(doc.uri).to.equal('')
      expect(doc.documentHash).to.equal(ethers.encodeBytes32String(''))
      expect(doc.lastModified).to.equal(0)

      const documentNames = await freshCmtat.getAllDocuments()
      expect(documentNames.length).to.equal(0)
    })
  })
}

module.exports = DocumentModuleCommon
