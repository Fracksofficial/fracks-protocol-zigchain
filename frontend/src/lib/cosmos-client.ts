import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { getZigChainConfig, ZIGCHAIN_TESTNET } from './zigchain-config';

export interface CosmosClientConfig {
  rpcEndpoint: string;
  chainId: string;
  prefix: string;
  gasPrice: string;
}

export class CosmosClient {
  private client: SigningCosmWasmClient | null = null;
  private wallet: DirectSecp256k1HdWallet | null = null;
  private config: CosmosClientConfig;

  constructor(config?: CosmosClientConfig) {
    this.config = config || getZigChainConfig();
  }

  async connect(mnemonic?: string): Promise<{
    address: string;
    client: SigningCosmWasmClient;
  }> {
    try {
      if (mnemonic) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: this.config.prefix,
        });
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized');
      }

      this.client = await SigningCosmWasmClient.connectWithSigner(
        this.config.rpcEndpoint,
        this.wallet,
        {
          gasPrice: GasPrice.fromString(this.config.gasPrice),
        }
      );

      const accounts = await this.wallet.getAccounts();
      return {
        address: accounts[0].address,
        client: this.client,
      };
    } catch (error) {
      console.error('Failed to connect to ZigChain:', error);
      throw error;
    }
  }

  async queryContract<T>(contractAddress: string, queryMsg: any): Promise<T> {
    if (!this.client) {
      throw new Error('Client not connected');
    }
    return this.client.queryContractSmart(contractAddress, queryMsg);
  }

  async executeContract(
    contractAddress: string,
    msg: any,
    funds?: any[]
  ): Promise<string> {
    if (!this.client || !this.wallet) {
      throw new Error('Client not connected or wallet not available');
    }

    const accounts = await this.wallet.getAccounts();
    const result = await this.client.execute(
      accounts[0].address,
      contractAddress,
      msg,
      'auto',
      undefined,
      funds
    );

    return result.transactionHash;
  }

  async getBalance(address: string, denom?: string): Promise<string> {
    if (!this.client) {
      throw new Error('Client not connected');
    }
    const actualDenom = denom || this.config.gasPrice.split('0.025')[1];
    const balance = await this.client.getBalance(address, actualDenom);
    return balance.amount;
  }

  // ZigChain specific methods
  async getChainInfo() {
    return {
      chainId: this.config.chainId,
      rpcEndpoint: this.config.rpcEndpoint,
      prefix: this.config.prefix,
      tokenSymbol: 'ZIG',
    };
  }

  async simulateTransaction(msg: any) {
    if (!this.client || !this.wallet) {
      throw new Error('Client not connected');
    }
    
    const accounts = await this.wallet.getAccounts();
    return this.client.simulate(
      accounts[0].address,
      [msg],
      'Simulating RWA transaction'
    );
  }
}

// Default client instance with ZigChain testnet
export const zigChainClient = new CosmosClient(ZIGCHAIN_TESTNET);