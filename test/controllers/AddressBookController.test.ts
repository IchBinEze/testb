import {
    AddressBookController,
    AddressBookControllerProps,
} from '../../src/controllers/AddressBookController';
import { expect } from 'chai';
import sinon from 'sinon';
import NetworkController from '../../src/controllers/NetworkController';
import { mockPreferencesController } from '../mocks/mock-preferences';
import PermissionsController from '@blank/background/controllers/PermissionsController';
import { PreferencesController } from '@blank/background/controllers/PreferencesController';
import { mockedPermissionsController } from '../mocks/mock-permissions';
import { ActivityListController } from '@blank/background/controllers/ActivityListController';
import {
    BlankDepositController,
    PendingWithdrawalsStore,
} from '@blank/background/controllers/blank-deposit/BlankDepositController';
import { IncomingTransactionController } from '@blank/background/controllers/IncomingTransactionController';
import { TokenOperationsController } from '@blank/background/controllers/erc-20/transactions/Transaction';
import {
    TokenController,
    TokenControllerProps,
} from '@blank/background/controllers/erc-20/TokenController';
import { AccountTrackerController } from '@blank/background/controllers/AccountTrackerController';
import { GasPricesController } from '@blank/background/controllers/GasPricesController';
import initialState from '@blank/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import BlockUpdatesController from '@blank/background/controllers/BlockUpdatesController';
import { ExchangeRatesController } from '@blank/background/controllers/ExchangeRatesController';
import { TornadoEventsService } from '@blank/background/controllers/blank-deposit/tornado/TornadoEventsService';
import TransactionController from '@blank/background/controllers/transactions/TransactionController';
import KeyringControllerDerivated from '@blank/background/controllers/KeyringControllerDerivated';

describe('Address book controller implementation', function () {
    const accounts = {
        goerli: [
            {
                key: '7fe1315d0fa2f408dacddb41deacddec915e85c982e9cbdaacc6eedcb3f9793b',
                address: '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
            },
            {
                key: '4b95973deb96905fd605d765f31d1ce651e627d61c136fa2b8eb246a3c549ebe',
                address: '0xbda8C7b7B5d0579Eb18996D1f684A434E4fF701f',
            },
        ],
    };
    let addressBookController: AddressBookController;
    let networkController: NetworkController;
    let transactionController: TransactionController;
    let tornadoEventsService: TornadoEventsService;
    let preferencesController: PreferencesController;
    let permissionsController: PermissionsController;
    let activityListController: ActivityListController;
    let blankDepositController: BlankDepositController;
    let tokenOperationsController: TokenOperationsController;
    let tokenController: TokenController;
    let incomingTransactionController: IncomingTransactionController;
    let accountTrackerController: AccountTrackerController;
    let keyringController: KeyringControllerDerivated;
    let blockUpdatesController: BlockUpdatesController;
    let exchangeRatesController: ExchangeRatesController;

    this.beforeAll(() => {
        networkController = getNetworkControllerInstance();
        preferencesController = mockPreferencesController;
        permissionsController = mockedPermissionsController;

        const gasPricesController = new GasPricesController(
            initialState.GasPricesController,
            networkController
        );

        tokenOperationsController = new TokenOperationsController({
            networkController: networkController,
        });
        tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
            },
            {
                tokenOperationsController: tokenOperationsController,
                preferencesController: preferencesController,
                networkController: networkController,
            } as TokenControllerProps
        );

        exchangeRatesController = new ExchangeRatesController(
            {
                exchangeRates: { ETH: 2786.23, USDT: 1 },
                networkNativeCurrency: {
                    symbol: 'ETH',
                    // Default Coingecko id for ETH rates
                    coingeckoPlatformId: 'ethereum',
                },
            },
            preferencesController,
            networkController,
            () => {
                return {};
            }
        );
        transactionController = new TransactionController(
            networkController,
            preferencesController,
            permissionsController,
            gasPricesController,
            {
                transactions: [],
            },
            async (ethTx: TypedTransaction) => {
                const privateKey = Buffer.from(accounts.goerli[0].key, 'hex');
                return Promise.resolve(ethTx.sign(privateKey));
            },
            { txHistoryLimit: 40 }
        );

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            accountTrackerController,
            gasPricesController,
            exchangeRatesController,
            incomingTransactionController,
            transactionController,
            { blockData: {} }
        );

        tornadoEventsService = new TornadoEventsService({
            endpoint: 'http://localhost:8080',
            version: 'v1',
            blockUpdatesController,
        });

        blankDepositController = new BlankDepositController({
            networkController: networkController,
            preferencesController: preferencesController,
            transactionController: transactionController,
            tokenOperationsController: tokenOperationsController,
            tokenController: tokenController,
            gasPricesController: gasPricesController,
            initialState: {
                pendingWithdrawals: {} as PendingWithdrawalsStore,
                vaultState: { vault: '' },
            },
            blockUpdatesController,
            tornadoEventsService,
        });
        keyringController = new KeyringControllerDerivated({});
        accountTrackerController = new AccountTrackerController(
            keyringController,
            networkController,
            tokenController,
            tokenOperationsController,
            { accounts: {}, isAccountTrackerLoading: false }
        );
        incomingTransactionController = new IncomingTransactionController(
            networkController,
            preferencesController,
            accountTrackerController,
            {} as any
        );
        activityListController = new ActivityListController(
            transactionController,
            blankDepositController,
            incomingTransactionController,
            preferencesController,
            networkController
        );
    });
    beforeEach(() => {
        const addressBookControllerProps: AddressBookControllerProps = {
            initialState: {
                addressBook: {} as any,
                recentAddresses: {} as any,
            },
            networkController,
            activityListController,
            preferencesController,
        };
        addressBookController = new AddressBookController(
            addressBookControllerProps
        );
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('clear', function () {
        it('Should clear the address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // get all
            let addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);

            //clear
            let clear_result = await addressBookController.clear();
            expect(clear_result).equal(true);

            // get all
            addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(0);

            //clear the clean
            clear_result = await addressBookController.clear();
            expect(clear_result).equal(false);
        });
    });

    describe('delete', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.delete('not a valid address');
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.delete(address);
            expect(result).equal(false);
        });
        it('Should delete a entry in the address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // delete the first
            let delete_result = await addressBookController.delete(
                '0x2231234435344D865C8966f4945844843EDAff91'
            );
            expect(delete_result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(true);

            // delete the first
            delete_result = await addressBookController.delete(
                '0x2231234435344D865C8966f4945844843EDAff91'
            );
            expect(delete_result).equal(false);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(false);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(true);
        });
    });

    describe('set', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.set(
                    'not a valid address',
                    'test entry',
                    'note'
                );
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.set(
                address,
                'test entry',
                'note'
            );
            expect(result).equal(false);
        });
        it('Should add a new entry to the address book', async () => {
            // add the first
            const address_1 = '0x2231234435344D865C8966f4945844843EDAff91';
            const name_1 = 'test entry';
            const note_1 = 'note';
            let result = await addressBookController.set(
                address_1,
                name_1,
                note_1
            );
            expect(result).equal(true);

            // add the second
            const address_2 = '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407';
            const name_2 = 'test entry 2';
            const note_2 = 'note 2';
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get all
            const addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);

            // get the first
            const entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            const entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);
        });
    });

    describe('get', function () {
        it('Should get the whole address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // get all
            let addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(1);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // get all
            addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);
        });
    });

    describe('getByAddress', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.getByAddress('not a valid address');
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.getByAddress(address);
            expect(result).to.be.undefined;
        });
        it('Should add a new entry to the address book', async () => {
            // add the first
            const address_1 = '0x2231234435344D865C8966f4945844843EDAff91';
            const name_1 = 'test entry';
            const note_1 = 'note';
            let result = await addressBookController.set(
                address_1,
                name_1,
                note_1
            );
            expect(result).equal(true);

            // add the second
            const address_2 = '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407';
            const name_2 = 'test entry 2';
            const note_2 = 'note 2';
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get the first
            let entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            let entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);

            // delete the first
            let delete_result = await addressBookController.delete(address_1);
            expect(delete_result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(address_2);
            expect(delete_result).equal(true);

            // get the first
            entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.undefined;

            // get the second
            entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.undefined;

            // add the first
            result = await addressBookController.set(address_1, name_1, note_1);
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get the first
            entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);
        });
    });
});
