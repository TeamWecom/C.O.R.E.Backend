import {log} from './log';

export function decrypt(key, hash) {
    try{
        //var iv = iv.substring(0, 16);
        log("key: " + key)
        log("hash: " + hash)
        // encryption using AES-128 in CTR mode
        var ciphertext = Crypto.cipher("AES", "CTR", key, true).iv(key).crypt(hash);
        log("Crypted: " + ciphertext);
        // decryption using AES-128 in CTR mode
        var decrypted = Crypto.cipher("AES", "CTR", key, false).iv(key).crypt(hash);
        log("Decrypted: " + decrypted);
        // now decrypted contains the plain text again

        return JSON.parse(decrypted);
    }catch(e){
        return e
    }
}