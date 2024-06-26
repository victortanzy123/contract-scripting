import {Contract} from 'ethers';
import hre, {ethers} from 'hardhat';

// Helpers
import {deploy, getContractAt, getTimestampInSeconds} from '../utils/helpers';
// ABI
import {TokenPermit} from '../../typechain-types';

const BLAST_WETH_ADDRESS = '0x4300000000000000000000000000000000000004';
const BLAST_TOKEN_ADDRESS = '0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad';

async function main() {
  const [deployer, altAccount] = await hre.ethers.getSigners(); // Get signer object
  // const tokenPermit = await deploy<TokenPermit>(deployer, 'TokenPermit', [], false);
  const tokenPermit = await getContractAt('TokenPermit', BLAST_WETH_ADDRESS);

  const NULL_VALUE = ethers.utils.parseEther('0'); // tested with 1
  const deadline = getTimestampInSeconds() + 4200;

  const chainId = await deployer.getChainId();

  // Get current nonce from WETH address
  const curNonce = await tokenPermit.nonces(deployer.address);
  console.log('See nonce:', curNonce);
  // set the domain parameters
  const domain = {
    name: await tokenPermit.name(),
    version: '1',
    chainId,
    verifyingContract: tokenPermit.address,
  };

  // set the Permit type parameters
  const types = {
    Permit: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  };

  // set the Permit type values
  const values = {
    owner: deployer.address,
    spender: altAccount.address,
    value: NULL_VALUE,
    nonce: curNonce,
    deadline: deadline,
  };

  // sign the Permit type data with the deployer's private key
  const signature = await deployer._signTypedData(domain, types, values);

  // split the signature into its components
  const sig = ethers.utils.splitSignature(signature);

  // verify the Permit type data with the signature
  const recovered = ethers.utils.verifyTypedData(domain, types, values, sig);

  // permit the tokenReceiver address to spend tokens on behalf of the tokenOwner
  let tx = await tokenPermit
    .connect(altAccount)
    .permit(deployer.address, altAccount.address, NULL_VALUE, deadline, sig.v, sig.r, sig.s);

  const receipt = await tx.wait();
  console.log('Successfully permitted: ', receipt);
  // check that the tokenReceiver address can now spend tokens on behalf of the tokenOwner
  console.log(`Check allowance of altAccount: ${await tokenPermit.allowance(deployer.address, altAccount.address)}`);
  console.log(`Check nonce of deployer: ${await tokenPermit.nonces(deployer.address)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
