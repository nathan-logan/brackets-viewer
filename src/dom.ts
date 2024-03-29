import { ParticipantResult } from './models';
import { rankingHeader } from './helpers';
import { abbreviations } from './lang';
import { Connection, FinalType, BracketType, Placement, Ranking, RankingItem } from './types';

/**
 * Creates the title of the viewer.
 *
 * @param title The title to set.
 */
export function createTitle(title: string): HTMLElement {
    const h1 = document.createElement('h1');
    h1.innerText = title;
    return h1;
}

/**
 * Creates a container which contains a stage.
 *
 * @param stageId ID of the stage.
 * @param stageType Type of the stage
 */
export function createStageContainer(stageId: number, stageType:string): HTMLElement {
    const stage = document.createElement('div');
    stage.classList.add(stageType);
    stage.setAttribute('data-stage-id', stageId.toString());
    return stage;
}

/**
 * Creates a container which contains a group.
 *
 * @param groupId ID of the group.
 * @param title Title of the group.
 */
export function createGroupContainer(groupId: number, title: string): HTMLElement {
    const h2 = document.createElement('h2');
    h2.innerText = title;

    const group = document.createElement('section');
    group.classList.add('group');
    group.setAttribute('data-group-id', groupId.toString());
    group.append(h2);
    return group;
}

/**
 * Creates a container which contains a round.
 *
 * @param roundId ID of the round.
 * @param title Title of the round.
 */
export function createRoundContainer(roundId: number, title: string): HTMLElement {
    const roundTitle = document.createElement('h3');
    roundTitle.innerText = title;

    const round = document.createElement('article');
    round.classList.add('round');
    round.setAttribute('data-round-id', roundId.toString());
    round.append(roundTitle);
    return round;
}

/**
 * Creates a container which contains a match.
 *
 * @param matchId ID of the match.
 * @param status Status of the match.
 */
export function createMatchContainer(matchId: number, status: number): HTMLElement {
    const match = document.createElement('div');
    match.classList.add('match');
    match.setAttribute('data-match-id', matchId.toString());
    match.setAttribute('data-match-status', status.toString());
    return match;
}

/**
 * Creates a container which contains a match.
 *
 * @param matchId ID of the match.
 * @param status Status of the match.
 */
export function createFFAMatchContainer(matchId: number, status: number): HTMLElement {
    const match = document.createElement('div');
    match.classList.add('ffa-match');
    match.setAttribute('data-match-id', matchId.toString());
    match.setAttribute('data-match-status', status.toString());
    return match;
}

/**
 * Creates a container which contains the label of a match.
 *
 * @param label The label of the match.
 * @param status The status to set as tooltip.
 */
export function createMatchLabel(label: string, status: string): HTMLElement {
    const span = document.createElement('span');
    span.innerText = label;
    span.title = status;
    return span;
}

/**
 * Creates a container which contains the child count label of a match.
 *
 * @param label The child count label of the match.
 */
export function createChildCountLabel(label: string): HTMLElement {
    const span = document.createElement('span');
    span.innerText = label;
    return span;
}

/**
 * Creates a container which contains the opponents of a match.
 */
export function createOpponentsContainer(): HTMLElement {
    const opponents = document.createElement('div');
    opponents.classList.add('opponents');
    return opponents;
}

/**
 * Creates a container which contains a participant.
 *
 * @param participantId ID of the participant.
 */
export function createParticipantContainer(participantId: number | null): HTMLElement {
    const participant = document.createElement('div');
    participant.classList.add('participant');

    if (participantId !== null)
        participant.setAttribute('data-participant-id', participantId.toString());

    return participant;
}

/**
 * Creates a container which contains the name of a participant.
 */
export function createNameContainer(): HTMLElement {
    const name = document.createElement('div');
    name.classList.add('name');
    return name;
}

/**
 * Creates a container which contains the result of a match for a participant.
 */
export function createResultContainer(): HTMLElement {
    const result = document.createElement('div');
    result.classList.add('result');
    return result;
}

/**
 * Creates a table.
 */
export function createTable(): HTMLElement {
    return document.createElement('table');
}

/**
 * Creates a table row.
 */
export function createRow(): HTMLElement {
    return document.createElement('tr');
}

/**
 * Creates a table cell.
 *
 * @param data The data in the cell.
 */
export function createCell(data: string | number): HTMLElement {
    const td = document.createElement('td');
    td.innerText = String(data);
    return td;
}

/**
 * Creates the headers for a ranking table.
 *
 * @param ranking The object containing the ranking.
 */
export function createRankingHeaders(ranking: Ranking): HTMLElement {
    const headers = document.createElement('tr');
    const firstItem = ranking[0];

    for (const key in firstItem) {
        const prop = key as keyof RankingItem;
        const header = rankingHeader(prop);
        const th = document.createElement('th');
        th.innerText = header.text;
        th.setAttribute('title', header.tooltip);
        headers.append(th);
    }

    return headers;
}

/**
 * Sets a hint on a name container.
 *
 * @param nameContainer The name container.
 * @param hint The hint to set.
 */
export function setupHint(nameContainer: HTMLElement, hint: string): void {
    nameContainer.classList.add('hint');
    nameContainer.innerText = hint;
}

/**
 * Sets a win for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupWin(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'win') {
        participantContainer.classList.add('win');

        if (participant.score === undefined)
            resultContainer.innerText = abbreviations.win;
    }
}

/**
 * Sets a loss for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupLoss(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'loss' || participant.forfeit) {
        participantContainer.classList.add('loss');

        if (participant.forfeit)
            resultContainer.innerText = abbreviations.forfeit;
        else if (participant.score === undefined)
            resultContainer.innerText = abbreviations.loss;
    }
}

/**
 * Adds the participant origin to a name.
 *
 * @param nameContainer The name container.
 * @param text The text to set (origin).
 * @param placement The placement of the participant origin.
 */
export function addParticipantOrigin(nameContainer: HTMLElement, text: string, placement: Placement): void {
    const span = document.createElement('span');

    if (placement === 'before') {
        span.innerText = `${text} `;
        nameContainer.prepend(span);
    } else if (placement === 'after') {
        span.innerText = ` (${text})`;
        nameContainer.append(span);
    }
}

/**
 * Adds the participant image to a name.
 *
 * @param nameContainer The name container.
 * @param src Source of the image.
 */
export function addParticipantImage(nameContainer: HTMLElement, src: string): void {
    const img = document.createElement('img');
    img.src = src;
    nameContainer.prepend(img);
}

/**
 * Returns the connection for a given round in a bracket.
 *
 * @param roundNumber Number of the round.
 * @param roundCount Count of rounds.
 * @param matchLocation Location of the match.
 * @param connectFinal Whether to connect to the final.
 */
export function getBracketConnection(roundNumber: number, roundCount: number, matchLocation?: BracketType, connectFinal?: boolean): Connection {
    if (matchLocation === 'loser-bracket') {
        return {
            connectPrevious: roundNumber > 1 && (roundNumber % 2 === 1 ? 'square' : 'straight'),
            connectNext: roundNumber < roundCount && (roundNumber % 2 === 0 ? 'square' : 'straight'),
        };
    }

    return {
        connectPrevious: roundNumber > 1 && 'square',
        connectNext: roundNumber < roundCount ? 'square' : (connectFinal ? 'straight' : false),
    };
}

/**
 * Returns the connection for a given round in the final.
 *
 * @param finalType Type of final.
 * @param roundNumber Number of the round.
 * @param matchCount The count of matches.
 */
export function getFinalConnection(finalType: FinalType, roundNumber: number, matchCount: number): Connection {
    return {
        connectPrevious: finalType === 'grand_final' && (roundNumber === 1 && 'straight'),
        connectNext: matchCount === 2 && roundNumber === 1 && 'straight',
    };
}

/**
 * Sets the connection a match containers.
 *
 * @param opponentsContainer The opponents container.
 * @param matchContainer The match container.
 * @param connection The connection to set.
 */
export function setupConnection(opponentsContainer: HTMLElement, matchContainer: HTMLElement, connection: Connection): void {
    if (connection.connectPrevious)
        opponentsContainer.classList.add('connect-previous');

    if (connection.connectNext)
        matchContainer.classList.add('connect-next');

    if (connection.connectPrevious === 'straight')
        opponentsContainer.classList.add('straight');

    if (connection.connectNext === 'straight')
        matchContainer.classList.add('straight');
}