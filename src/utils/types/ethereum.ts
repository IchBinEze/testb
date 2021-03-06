import { AppStateControllerMemState } from '@blank/background/controllers/AppStateController';
import { BlankProviderControllerState } from '@blank/background/controllers/BlankProviderController';
import { PermissionsControllerState } from '@blank/background/controllers/PermissionsController';
import { TransactionVolatileControllerState } from '@blank/background/controllers/transactions/TransactionController';
import { SiteMetadata } from '@blank/provider/types';
import { TransactionParams } from '../../controllers/transactions/utils/types';

export type TransactionRequest = TransactionParams & { gas?: string | number };

export enum ProviderError {
    INVALID_PARAMS = 'INVALID_PARAMS',
    RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
    TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    UNSUPPORTED_METHOD = 'UNSUPPORTED_METHOD',
    USER_REJECTED_REQUEST = 'USER_REJECTED_REQUEST',
}

// Types for window management
export enum WindowRequest {
    DAPP = 'DAPP',
    LOCK = 'LOCK',
    PERMISSIONS = 'PERMISSIONS',
    TRANSACTIONS = 'TRANSACTIONS',
}

export interface WindowRequestArguments {
    [WindowRequest.DAPP]: BlankProviderControllerState;
    [WindowRequest.LOCK]: AppStateControllerMemState;
    [WindowRequest.PERMISSIONS]: PermissionsControllerState;
    [WindowRequest.TRANSACTIONS]: TransactionVolatileControllerState;
}

// Type of dapp request
export enum DappReq {
    ASSET = 'ASSET',
    SIGNING = 'SIGNING',
    SWITCH_NETWORK = 'SWITCH_NETWORK',
}

export interface DappRequestParams {
    [DappReq.ASSET]: WatchAssetReq;
    [DappReq.SIGNING]: DappSignatureReq<SignatureTypes>;
    [DappReq.SWITCH_NETWORK]: NormalizedSwitchEthereumChainParameters;
}

export type DappRequestType = keyof DappRequestParams;

// Dapp request handle optional confirmation parameters
export type DappRequestConfirmOptions = WatchAssetConfirmParams;

// Dapp request submitted to state interface
export interface DappRequest<Type extends DappRequestType> {
    type: Type;
    params: DappRequestParams[Type];
    origin: string;
    siteMetadata: SiteMetadata;

    /**
     * The time at it was requested
     */
    time: number;
}

// EIP-3085
export interface AddEthereumChainParameter {
    chainId: string;
    blockExplorerUrls?: string[];
    chainName?: string;
    iconUrls?: string[];
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls?: string[];
}

// EIP-3326
export interface SwitchEthereumChainParameters {
    chainId: string;
}

export interface NormalizedSwitchEthereumChainParameters {
    chainId: number;
}

// EIP-1193
export interface GetPermissionResponse {
    invoker: string;
    parentCapability?: string;
    caveats?: Record<string, unknown>[];
}

// EIP-747
export interface WatchAssetParameters {
    type: string; // Asset's interface
    options: {
        address: string;
        symbol?: string; // Ticker
        decimals?: number;
        image?: string; // URL or Base64 image
    };
}

export interface WatchAssetReq {
    params: {
        address: string;
        symbol: string; // Ticker
        decimals: number;
        image?: string; // URL
    };
    accountAddress?: string; // Account connected to the dapp
    isUpdate: boolean; // If token already exists
    savedToken?: WatchAssetReq['params']; // Existing token data
}

export interface WatchAssetConfirmParams {
    symbol: string;
    decimals: number;
    image: string;
}

// EIP-712

// Signature dapp request interface
export interface DappSignatureReq<T extends SignatureTypes> {
    method: T;
    params: NormalizedSignatureParams<T>;
}

// Raw data for each method (Direct input from the provider)
export interface RawSignatureData {
    [JSONRPCMethod.personal_sign]: [string, string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData]: [V1TypedData[], string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData_v1]: [V1TypedData[], string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData_v3]: [string, string]; // [account, data]
    [JSONRPCMethod.eth_signTypedData_v4]: [string, string]; // [account, data]
}

// Data submitted to the dapp request
export interface NormalizedSignatureData {
    [JSONRPCMethod.personal_sign]: string;
    [JSONRPCMethod.eth_signTypedData]: V1TypedData[];
    [JSONRPCMethod.eth_signTypedData_v1]: V1TypedData[];
    [JSONRPCMethod.eth_signTypedData_v3]: TypedMessage<MessageSchema>;
    [JSONRPCMethod.eth_signTypedData_v4]: TypedMessage<MessageSchema>;
}

export type SignatureTypes = keyof RawSignatureData;

// Normalized signature parameters
export interface SignatureParams<Type extends SignatureTypes> {
    address: string;
    data: RawSignatureData[Type][0]; // It's actually inverted for v3 & v4 but it's the same type
}

export interface NormalizedSignatureParams<Type extends SignatureTypes> {
    address: string;
    data: NormalizedSignatureData[Type];
}

// Adapt version to keyring sig util
export const sigVersion: {
    [method in SignatureTypes]: { version: 'V1' | 'V3' | 'V4' };
} = {
    personal_sign: { version: 'V1' }, // TODO: Fix
    eth_signTypedData: { version: 'V1' },
    eth_signTypedData_v1: { version: 'V1' },
    eth_signTypedData_v3: { version: 'V3' },
    eth_signTypedData_v4: { version: 'V4' },
};

// eth_signTypedData_v1
export interface V1TypedData {
    name: string;
    type: string;
    value: unknown;
}

// eth_signTypedData_v3 & eth_signTypedData_v4
// V4 allows arrays in message content
export interface TypedMessage<T extends MessageSchema> {
    types: T;
    primaryType: keyof T;
    domain: EIP712Domain;
    message: Record<string, unknown>;
}

// "Domain" info for v3 and v4
export interface EIP712Domain {
    chainId?: number;
    name?: string;
    salt?: string;
    verifyingContract?: string;
    version?: string;
}

export type EIP712DomainKey = keyof EIP712Domain;

// v3 and v4 message schema
export interface MessageSchema {
    EIP712Domain: MessageTypeProperty[];
    [additionalProperties: string]: MessageTypeProperty[];
}

export declare type SignedMsgParams<D> = Required<MsgParams<D>>;

export interface MsgParams<D> {
    data: D;
    sig?: string;
}

interface MessageTypeProperty {
    name: string;
    type: string;
}

export const typedMessageSchema = {
    type: 'object',
    properties: {
        types: {
            type: 'object',
            additionalProperties: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                    },
                    required: ['name', 'type'],
                },
            },
        },
        primaryType: { type: 'string' },
        domain: { type: 'object' },
        message: { type: 'object' },
    },
    required: ['types', 'primaryType', 'domain', 'message'],
};

// JSON RPC methods

export enum JSONRPCMethod {
    db_getHex = 'db_getHex',
    db_getString = 'db_getString',
    db_putHex = 'db_putHex',
    db_putString = 'db_putString',
    eth_accounts = 'eth_accounts',
    eth_blockNumber = 'eth_blockNumber',
    eth_call = 'eth_call',
    eth_chainId = 'eth_chainId',
    eth_coinbase = 'eth_coinbase',
    eth_compileLLL = 'eth_compileLLL',
    eth_compileSerpent = 'eth_compileSerpent',
    eth_compileSolidity = 'eth_compileSolidity',
    eth_estimateGas = 'eth_estimateGas',
    eth_feeHistory = 'eth_feeHistory',
    eth_gasPrice = 'eth_gasPrice',
    eth_getBalance = 'eth_getBalance',
    eth_getBlockByHash = 'eth_getBlockByHash',
    eth_getBlockByNumber = 'eth_getBlockByNumber',
    eth_getBlockTransactionCountByHash = 'eth_getBlockTransactionCountByHash',
    eth_getBlockTransactionCountByNumber = 'eth_getBlockTransactionCountByNumber',
    eth_getCode = 'eth_getCode',
    eth_getCompilers = 'eth_getCompilers',
    eth_getFilterChanges = 'eth_getFilterChanges',
    eth_getFilterLogs = 'eth_getFilterLogs',
    eth_getLogs = 'eth_getLogs',
    eth_getStorageAt = 'eth_getStorageAt',
    eth_getTransactionByBlockHashAndIndex = 'eth_getTransactionByBlockHashAndIndex',
    eth_getTransactionByBlockNumberAndIndex = 'eth_getTransactionByBlockNumberAndIndex',
    eth_getTransactionByHash = 'eth_getTransactionByHash',
    eth_getTransactionCount = 'eth_getTransactionCount',
    eth_getTransactionReceipt = 'eth_getTransactionReceipt',
    eth_getUncleByBlockHashAndIndex = 'eth_getUncleByBlockHashAndIndex',
    eth_getUncleByBlockNumberAndIndex = 'eth_getUncleByBlockNumberAndIndex',
    eth_getUncleCountByBlockHash = 'eth_getUncleCountByBlockHash',
    eth_getUncleCountByBlockNumber = 'eth_getUncleCountByBlockNumber',
    eth_getWork = 'eth_getWork',
    eth_mining = 'eth_mining',
    eth_newBlockFilter = 'eth_newBlockFilter',
    eth_newFilter = 'eth_newFilter',
    eth_protocolVersion = 'eth_protocolVersion',
    eth_requestAccounts = 'eth_requestAccounts',
    eth_sendRawTransaction = 'eth_sendRawTransaction',
    eth_sendTransaction = 'eth_sendTransaction',
    eth_sign = 'eth_sign',
    eth_signTransaction = 'eth_signTransaction',
    eth_signTypedData = 'eth_signTypedData',
    eth_signTypedData_v1 = 'eth_signTypedData_v1',
    eth_signTypedData_v3 = 'eth_signTypedData_v3',
    eth_signTypedData_v4 = 'eth_signTypedData_v4',
    eth_submitWork = 'eth_submitWork',
    eth_uninstallFilter = 'eth_uninstallFilter',
    net_listening = 'net_listening',
    net_peerCount = 'net_peerCount',
    net_version = 'net_version',
    personal_ecRecover = 'personal_ecRecover',
    personal_sign = 'personal_sign',
    shh_addToGroup = 'shh_addToGroup',
    shh_getFilterChanges = 'shh_getFilterChanges',
    shh_getMessages = 'shh_getMessages',
    shh_hasIdentity = 'shh_hasIdentity',
    shh_newFilter = 'shh_newFilter',
    shh_newGroup = 'shh_newGroup',
    shh_newIdentity = 'shh_newIdentity',
    shh_post = 'shh_post',
    shh_uninstallFilter = 'shh_uninstallFilter',
    shh_version = 'shh_version',
    wallet_addEthereumChain = 'wallet_addEthereumChain',
    wallet_switchEthereumChain = 'wallet_switchEthereumChain',
    wallet_getPermissions = 'wallet_getPermissions',
    wallet_requestPermissions = 'wallet_requestPermissions',
    wallet_watchAsset = 'wallet_watchAsset',
    web3_clientVersion = 'web3_clientVersion',
    web3_sha3 = 'web3_sha3',
    eth_subscribe = 'eth_subscribe',
}

// External provider methods

export const ExtProviderMethods = [
    JSONRPCMethod.eth_blockNumber,
    JSONRPCMethod.eth_call,
    JSONRPCMethod.eth_estimateGas,
    JSONRPCMethod.eth_feeHistory,
    JSONRPCMethod.eth_gasPrice,
    JSONRPCMethod.eth_getBalance,
    JSONRPCMethod.eth_getBlockByHash,
    JSONRPCMethod.eth_getBlockByNumber,
    JSONRPCMethod.eth_getBlockTransactionCountByHash,
    JSONRPCMethod.eth_getBlockTransactionCountByNumber,
    JSONRPCMethod.eth_getCode,
    JSONRPCMethod.eth_getLogs,
    JSONRPCMethod.eth_getStorageAt,
    JSONRPCMethod.eth_getTransactionByBlockHashAndIndex,
    JSONRPCMethod.eth_getTransactionByBlockNumberAndIndex,
    JSONRPCMethod.eth_getTransactionByHash,
    JSONRPCMethod.eth_getTransactionCount,
    JSONRPCMethod.eth_getTransactionReceipt,
    JSONRPCMethod.eth_getUncleByBlockHashAndIndex,
    JSONRPCMethod.eth_getUncleByBlockNumberAndIndex,
    JSONRPCMethod.eth_getUncleCountByBlockHash,
    JSONRPCMethod.eth_getUncleCountByBlockNumber,
    JSONRPCMethod.eth_getWork,
    JSONRPCMethod.eth_mining,
    JSONRPCMethod.eth_protocolVersion,
    JSONRPCMethod.eth_sendRawTransaction,
    JSONRPCMethod.eth_submitWork,
    JSONRPCMethod.net_listening,
    JSONRPCMethod.net_peerCount,
    JSONRPCMethod.net_version,
    JSONRPCMethod.web3_clientVersion,
    JSONRPCMethod.eth_subscribe,
];
