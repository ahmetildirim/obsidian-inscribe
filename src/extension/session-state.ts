// State management for suggestion sessions

import { StateEffect, Text, StateField, Transaction } from '@codemirror/state';
import { SuggestionSession } from './types';

// Effect to update the suggestion session state.
// A `null` content signals a reset.
export const SuggestionUpdateEffect = StateEffect.define<{
    content: string | null;
    document: Text | null;
    anchor: number | null;
}>();

// Creates a fresh, empty suggestion session.
export function getResetSession(): SuggestionSession {
    return {
        fullText: null,
        remainingText: null,
        baselineDocument: null,
        anchorPosition: null,
    };
}

// Update session state based on an incoming effect.
export function updateSessionFromEffect(effect: {
    content: string | null;
    document: Text | null;
    anchor: number | null;
}): SuggestionSession {
    return effect.content === null
        ? getResetSession()
        : initializeSession(effect as {
            content: string;
            document: Text;
            anchor: number;
        });
}

// Initializes a new suggestion session with provided effect data.
function initializeSession(effect: {
    content: string;
    document: Text;
    anchor: number;
}): SuggestionSession {
    return {
        fullText: effect.content,
        remainingText: effect.content,
        baselineDocument: effect.document,
        anchorPosition: effect.anchor,
    };
}

// Adjust the suggestion session in response to document changes.
export function updateSessionOnDocumentChange(
    session: SuggestionSession,
    transaction: Transaction
): SuggestionSession {
    let insertedContent = '';
    let insertionAtAnchor = false;

    // Iterate over document changes to detect an insertion at the suggestion's anchor.
    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        if (fromA === session.anchorPosition && toA === fromA) {
            insertedContent = inserted.toString();
            insertionAtAnchor = true;
        }
    });

    if (!insertionAtAnchor || !session.remainingText) {
        return invalidateSession(session);
    }

    // Verify the inserted text matches the pending suggestion.
    if (session.remainingText.startsWith(insertedContent)) {
        return advanceSession(session, insertedContent.length);
    }

    return invalidateSession(session);
}

// Advance the session by consuming accepted text.
function advanceSession(
    session: SuggestionSession,
    consumedLength: number
): SuggestionSession {
    return {
        ...session,
        remainingText:
            session.remainingText!.slice(consumedLength).length > 0
                ? session.remainingText!.slice(consumedLength)
                : null,
        anchorPosition: session.anchorPosition! + consumedLength,
    };
}

// Invalidate the session, effectively cancelling any pending suggestion.
function invalidateSession(session: SuggestionSession): SuggestionSession {
    return {
        ...session,
        remainingText: null,
        anchorPosition: null,
    };
}

// Cancel the suggestion if the cursor has drifted away.
export function updateSessionOnCursorDrift(
    session: SuggestionSession,
    transaction: Transaction
): SuggestionSession {
    return transaction.state.selection.main.head !== session.anchorPosition
        ? invalidateSession(session)
        : session;
}

// The state field that holds the current suggestion session.
export const suggestionSessionState = StateField.define<SuggestionSession>({
    create: () => getResetSession(),

    update(session, transaction) {
        // Process explicit session update effects.
        const effect = transaction.effects.find((e) =>
            e.is(SuggestionUpdateEffect)
        );
        if (effect) return updateSessionFromEffect(effect.value);

        // If the document has changed, adjust the session.
        if (
            transaction.docChanged &&
            session.remainingText &&
            session.anchorPosition !== null
        ) {
            return updateSessionOnDocumentChange(session, transaction);
        }

        // If there is an active suggestion but the cursor has moved, cancel it.
        if (session.remainingText !== null && session.anchorPosition !== null) {
            return updateSessionOnCursorDrift(session, transaction);
        }

        return session;
    },
});
