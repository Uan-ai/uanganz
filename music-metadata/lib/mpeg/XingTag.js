"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readXingHeader = exports.XingHeaderFlags = exports.LameEncoderVersion = exports.InfoTagHeaderTag = void 0;
const Token = require("token-types");
const Util_1 = require("../common/Util");
/**
 * Info Tag: Xing, LAME
 */
exports.InfoTagHeaderTag = new Token.StringType(4, 'ascii');
/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
exports.LameEncoderVersion = new Token.StringType(6, 'ascii');
/**
 * Info Tag
 * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
 */
exports.XingHeaderFlags = {
    len: 4,
    get: (buf, off) => {
        return {
            frames: Util_1.default.isBitSet(buf, off, 31),
            bytes: Util_1.default.isBitSet(buf, off, 30),
            toc: Util_1.default.isBitSet(buf, off, 29),
            vbrScale: Util_1.default.isBitSet(buf, off, 28)
        };
    }
};
// /**
//  * XING Header Tag
//  * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
//  */
async function readXingHeader(tokenizer) {
    const flags = await tokenizer.readToken(exports.XingHeaderFlags);
    const xingInfoTag = {};
    if (flags.frames) {
        xingInfoTag.numFrames = await tokenizer.readToken(Token.UINT32_BE);
    }
    if (flags.bytes) {
        xingInfoTag.streamSize = await tokenizer.readToken(Token.UINT32_BE);
    }
    if (flags.toc) {
        xingInfoTag.toc = Buffer.alloc(100);
        await tokenizer.readBuffer(xingInfoTag.toc);
    }
    if (flags.vbrScale) {
        xingInfoTag.vbrScale = await tokenizer.readToken(Token.UINT32_BE);
    }
    const lameTag = await tokenizer.peekToken(new Token.StringType(4, 'ascii'));
    if (lameTag === 'LAME') {
        xingInfoTag.lame = {
            version: await tokenizer.readToken(new Token.StringType(9, 'ascii'))
        };
    }
    return xingInfoTag;
}
exports.readXingHeader = readXingHeader;
