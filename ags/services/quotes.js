import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

class QuotesService extends Service {
    static {
        Service.register(this, {}, {
            'content': ['string'],
            'author': ['string'],
            'loading': ['boolean'],
        });
    }

    #content = '';
    #author = '';
    #loading = true;

    constructor() {
        super();
        this.fetch().catch(console.error);
    }

    get content() { return this.#content; }
    get author() { return this.#author; }
    get loading() { return this.#loading; }

    async fetch() {
        try {
            this.#loading = true;
            this.emit('changed');

            const cmd = [
                'curl',
                '--silent',
                '--location',
                '--insecure', // Skip SSL verification
                '--fail',
                '--show-error',
                '--max-time', '10',
                '--user-agent', 'Mozilla/5.0',
                'https://api.quotable.io/random'
            ];
            
            const result = await Utils.execAsync(cmd);

            if (!result) {
                throw new Error('Empty response from API');
            }

            const quote = JSON.parse(result);

            if (!quote.content || !quote.author) {
                throw new Error('Invalid quote format');
            }

            this.#content = quote.content;
            this.#author = quote.author;
        } catch (error) {
            this.#content = '';
            this.#author = '';
        } finally {
            this.#loading = false;
            this.emit('changed');
        }
    }
}

const service = new QuotesService();
export default service;
