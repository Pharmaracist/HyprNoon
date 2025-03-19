// File: services/medicaldictionary.js

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import Gio from 'gi://Gio';
import { writable } from '../modules/.miscutils/store.js';
import querystring from '../modules/.miscutils/querystring.js';

const API_KEY = userOptions.asyncGet().sidebar.ai.medicalDictionary.apiKey; // Replace with your actual API key.
const API_BASE_URL = 'https://www.dictionaryapi.com/api/v3/references/medical/json/';

// Helper function: convert GLib.Bytes to Uint8Array
function glibBytesToUint8Array(bytes) {
  // Extract the underlying data from the GLib.Bytes object.
  const data = bytes.get_data();
  // Check if the data is already a Uint8Array, otherwise wrap it.
  return (data instanceof Uint8Array) ? data : new Uint8Array(data);
}

// Common HTTP request helper using libsoup.
async function httpRequest(options) {
  return new Promise((resolve, reject) => {
    try {
      const session = new Soup.Session();
      const uri = options.uri;
      const message = new Soup.Message({
        method: options.method,
        uri: GLib.Uri.parse(uri, GLib.UriFlags.NONE)
      });
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          message.request_headers.append(key, value);
        }
      }
      if (options.body) {
        message.set_request_body_from_bytes(options.mime, new GLib.Bytes(options.body));
      }
      session.send_async(
        message,
        GLib.DEFAULT_PRIORITY,
        null,
        (session, result) => {
          try {
            const stream = session.send_finish(result);
            const msg = session.get_async_result_message(result);
            if (msg && msg.get_status() !== 200) {
              reject(new Error(`HTTP error: ${msg.get_status()}`));
              return;
            }
            let chunks = [];
            const reader = new Gio.DataInputStream({
              close_base_stream: true,
              base_stream: stream
            });
            function readChunk() {
              reader.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null, (reader, res) => {
                try {
                  let bytes = reader.read_bytes_finish(res);
                  if (bytes && bytes.get_size() > 0) {
                    // Convert GLib.Bytes to Uint8Array and decode as UTF-8.
                    let uint8 = glibBytesToUint8Array(bytes);
                    let chunk = (new TextDecoder('utf-8')).decode(uint8);
                    chunks.push(chunk);
                    readChunk();
                  } else {
                    resolve(chunks.join(''));
                  }
                } catch (e) {
                  reject(e);
                }
              });
            }
            readChunk();
          } catch (e) {
            reject(e);
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}
class MedicalDictionaryService {
  constructor() {
    this.entries = {};
    this.eventHandlers = {};
  }

  /**
   * Look up a medical term.
   * @param {string} term - The term to lookup.
   * @param {object} options - Optional parameters.
   * @returns {Promise<object>} Resolves with the entry.
   */
  async lookup(term, options = {}) {
    const url = `${API_BASE_URL}${encodeURIComponent(term)}?key=${API_KEY}`;
    try {
      const responseText = await httpRequest({
        uri: url,
        method: "GET"
      });
      const data = JSON.parse(responseText);
      const entry = {
        term,
        definition: data[0]?.shortdef
          ? data[0].shortdef.join('; ')
          : 'No definition found.',
        example: data[0]?.def ? extractExample(data[0].def) : ''
      };
      this.entries[term] = entry;
      this.emit('newEntry', entry);
      return entry;
    } catch (e) {
      console.error(`Lookup error for term "${term}": `, e);
      throw e;
    }
  }

  clear() {
    this.entries = {};
    this.emit('cleared');
  }

  on(event, callback) {
    if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
    this.eventHandlers[event].push(callback);
  }

  off(event, callback) {
    if (!this.eventHandlers[event]) return;
    this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.eventHandlers[event]) return;
    for (const cb of this.eventHandlers[event]) {
      cb(...args);
    }
  }
}

/**
 * Helper function to extract an example from the API's "def" field.
 * Adjust this parser as needed according to the API response.
 * @param {Array} defArr - The "def" array from the response.
 * @returns {string} An example text if available.
 */
function extractExample(defArr) {
  try {
    const sseq = defArr[0]?.sseq;
    if (Array.isArray(sseq)) {
      for (const senseGroup of sseq) {
        for (const sense of senseGroup) {
          if (sense[1]?.dt) {
            for (const dtItem of sense[1].dt) {
              if (dtItem[0] === "text" && typeof dtItem[1] === "string") {
                return dtItem[1].trim();
              }
            }
          }
        }
      }
    }
  } catch (e) {
    return '';
  }
  return '';
}

export default new MedicalDictionaryService();
