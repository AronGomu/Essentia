import { describe, expect, it } from 'vitest';
import { renderMseMarkup } from '../../src/lib/mse-markup';

describe('safe MSE markup', () => {
  it('renders semantic tags and strips editor-only wrappers', () => {
    expect(
      renderMseMarkup(
        '<b>On Enter</b> — <i-auto><kw-a><nospellcheck><key>Flash</key></nospellcheck></kw-a></i-auto>',
      ),
    ).toBe('<strong>On Enter</strong> — <em>Flash</em>');
  });
  it('rejects unknown payload tags before rendering', () => {
    expect(() =>
      renderMseMarkup('<b>safe</b> <script>alert(1)</script>'),
    ).toThrow('Unknown MSE tag: script');
  });
  it('rejects unbalanced allowlisted tags', () => {
    expect(() => renderMseMarkup('<b>broken</i>')).toThrow('Unbalanced');
  });
});

describe('keyword ruling reminders', () => {
  it('renders text unchanged without definitions', () => {
    const html = renderMseMarkup('<b>Draw</b> 1');
    expect(html).toBe('<strong>Draw</strong> 1');
    expect(html).not.toContain('reminder');
  });

  it('appends a ruling after a keyword', () => {
    const html = renderMseMarkup('<b>Bounce</b> it', {
      definitions: new Map([
        ['Bounce', "Return the indicated permanent to its owner's Hand."],
      ]),
    });
    expect(html).toContain(
      '<strong>Bounce</strong><span class="reminder">(Return the indicated permanent to its owner&#39;s Hand.)</span>',
    );
  });

  it('normalises a numeric parameter', () => {
    const html = renderMseMarkup('<b>Detach 2</b>', {
      definitions: new Map([['Detach N', 'Remove N essence counters.']]),
    });
    expect(html).toContain(
      '<span class="reminder">(Remove N essence counters.)</span>',
    );
  });

  it('splits a composite keyword', () => {
    const html = renderMseMarkup('<b>Negate & Destroy</b>', {
      definitions: new Map([
        ['Negate', 'Counter the indicated effect.'],
        ['Destroy', 'Send the indicated permanent to the graveyard.'],
      ]),
    });
    const match = html.match(/<span class="reminder">\(([^)]*)\)<\/span>/);
    expect(match?.[1]).toBe(
      'Counter the indicated effect. Send the indicated permanent to the graveyard.',
    );
  });

  it('leaves an unknown bold phrase alone', () => {
    const html = renderMseMarkup('<b>Some Title</b>', {
      definitions: new Map(),
    });
    expect(html).toBe('<strong>Some Title</strong>');
    expect(html).not.toContain('reminder');
  });

  it('repeats the ruling for a repeated keyword', () => {
    const html = renderMseMarkup('<b>Draw</b> 1. <b>Draw</b> 1 again.', {
      definitions: new Map([['Draw', 'Draw a card.']]),
    });
    expect(html.match(/class="reminder"/g)).toHaveLength(2);
  });

  it('still rejects an unknown MSE tag', () => {
    expect(() => renderMseMarkup('<blink>x</blink>')).toThrow(
      'Unknown MSE tag: blink',
    );
  });
});
