import assert from 'node:assert/strict';
import test from 'node:test';
import { removeOverlap, removeStreamingOverlap } from '../src/completions/overlap.ts';

test('removes an exact repeated prefix', () => {
    assert.equal(
        removeOverlap('MCP is a protocol ', 'MCP is a protocol that allows AI systems...'),
        'that allows AI systems...',
    );
});

test('removes the longest partial overlap', () => {
    assert.equal(removeOverlap('The quick brown', 'brown fox'), ' fox');
    assert.equal(removeOverlap('abcab', 'abcabc'), 'c');
});

test('preserves text without an overlap', () => {
    assert.equal(removeOverlap('The quick brown', ' jumps ahead'), ' jumps ahead');
    assert.equal(removeOverlap('abc', 'abx'), 'abx');
});

test('handles Chinese text', () => {
    assert.equal(removeOverlap('这是一个协议', '一个协议，可以连接工具'), '，可以连接工具');
});

test('handles mixed Chinese and English text', () => {
    assert.equal(removeOverlap('使用 MCP 协议 ', 'MCP 协议 to connect tools'), 'to connect tools');
});

async function* cumulativeChunks(chunks) {
    for (const chunk of chunks) yield chunk;
}

test('holds partial streamed echoes until the repeated context is complete', async () => {
    const suggestions = removeStreamingOverlap(
        'MCP is a protocol ',
        cumulativeChunks(['M', 'MCP', 'MCP is a protocol ', 'MCP is a protocol that', 'MCP is a protocol that allows']),
    );
    assert.deepEqual(await Array.fromAsync(suggestions), ['that', 'that allows']);
});

test('releases an ambiguous prefix when it diverges or the stream ends', async () => {
    assert.deepEqual(
        await Array.fromAsync(removeStreamingOverlap('abc', cumulativeChunks(['a', 'ab', 'abx']))),
        ['abx'],
    );
    assert.deepEqual(
        await Array.fromAsync(removeStreamingOverlap('abc', cumulativeChunks(['a', 'ab']))),
        ['ab'],
    );
});
