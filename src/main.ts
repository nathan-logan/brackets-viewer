import './styles/main.scss';
import { Participant, Match, ParticipantResult, Stage, FFAMatch } from './models';
import { splitBy, getRanking, getOriginAbbreviation, findRoot } from './helpers';
import * as dom from './dom';
import * as lang from './lang';
import {
    Config,
    Connection,
    FinalType,
    BracketType,
    OriginHint,
    ParticipantContainers,
    RankingItem,
    RoundName,
    ViewerData,
    Locale,
    ParticipantImage,
} from './types';

export class BracketsViewer {

    readonly participantRefs: { [participantId: number]: HTMLElement[] } = {};

    private participants: Participant[] = [];
    private participantImages: ParticipantImage[] = [];

    private config!: Config;
    private skipFirstRound!: boolean;

    /**
     * Renders data generated with `brackets-manager.js`. If multiple stages are given, they will all be displayed.
     *
     * Stages won't be discriminated visually based on the tournament they belong to.
     *
     * @param data The data to display.
     * @param config An optional configuration for the viewer.
     */
    public render(data: ViewerData, config?: Partial<Config>): void {
        const root = document.createDocumentFragment();

        this.config = {
            participantOriginPlacement: config?.participantOriginPlacement || 'before',
            separatedChildCountLabel: config?.separatedChildCountLabel !== undefined ? config.separatedChildCountLabel : false,
            showSlotsOrigin: config?.showSlotsOrigin !== undefined ? config.showSlotsOrigin : true,
            showLowerBracketSlotsOrigin: config?.showLowerBracketSlotsOrigin !== undefined ? config.showLowerBracketSlotsOrigin : true,
            highlightParticipantOnHover: config?.highlightParticipantOnHover !== undefined ? config.highlightParticipantOnHover : true,
        };

        this.participants = data.participants;

        data.participants.forEach(participant => this.participantRefs[participant.id] = []);

        data.stages.forEach((stage) => {
            // type assertion is needed here for the filter method
            const matches = (data.matches as Array<Match|FFAMatch>).filter((match: Match|FFAMatch) => match.stage_id === stage.id);

            this.renderStage(root, {
                ...data,
                stages: [stage],
                matches,
            });
        });

        findRoot(config?.selector).append(root);
    }

    /**
     * Adds a locale to the available i18n bundles.
     *
     * @param name Name of the locale.
     * @param locale Contents of the locale.
     */
    public addLocale(name: string, locale: Locale): void {
        lang.i18next.addResourceBundle(name, 'translation', locale);
        lang.i18next.changeLanguage();
    }

    /**
     * Sets the images which will be rendered for every participant.
     *
     * @param images The participant images.
     */
    public setParticipantImages(images: ParticipantImage[]): void {
        this.participantImages = images;
    }

    /**
     * Renders a stage (round-robin, single or double elimination, or ffa/elimination).
     *
     * @param root The root element.
     * @param data The data to display.
     */
    private renderStage(root: DocumentFragment, data: ViewerData): void {
        const stage = data.stages[0];
        const matchesByGroup = splitBy<Match|FFAMatch>(data.matches, 'group_id');

        this.skipFirstRound = stage.settings.skipFirstRound || false;

        // we apply type assertion in this switch in order to match the data to the required input params
        // An other alternative is to replace instances of "Match|FFAMatch" types with "any"
        switch (stage.type) {
            case 'round_robin':
                this.renderRoundRobin(root, stage, (matchesByGroup as Match[][]));
                break;
            case 'single_elimination':
            case 'double_elimination':
                this.renderElimination(root, stage, (matchesByGroup as Match[][]));
                break;
            case 'free-for-all':
                this.renderFreeForAll(root, stage, (matchesByGroup as FFAMatch[][]));
                break;
            default:
                throw Error(`Unknown bracket type: ${stage.type}`);
        }
    }

    /**
     * Renders a round-robin stage.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderRoundRobin(root: DocumentFragment, stage: Stage, matchesByGroup: Match[][]): void {
        const container = dom.createStageContainer(stage.id, 'round-robin');
        container.append(dom.createTitle(stage.name));

        let groupNumber = 1;

        for (const groupMatches of matchesByGroup) {
            const groupId = groupMatches[0].group_id;
            const groupContainer = dom.createGroupContainer(groupId, lang.getGroupName(groupNumber++));
            const matchesByRound = splitBy(groupMatches, 'round_id');

            let roundNumber = 1;

            for (const roundMatches of matchesByRound) {
                const roundId = roundMatches[0].round_id;
                const roundContainer = dom.createRoundContainer(roundId, lang.getRoundName(roundNumber++, 0));

                for (const match of roundMatches)
                    roundContainer.append(this.createMatch(match));

                groupContainer.append(roundContainer);
            }

            groupContainer.append(this.createRanking(groupMatches));
            container.append(groupContainer);
        }

        root.append(container);
    }

    /**
     * Renders a free for all stage.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderFreeForAll(root: DocumentFragment, stage: Stage, matchesByGroup: FFAMatch[][]): void {
        const container = dom.createStageContainer(stage.id, 'free-for-all');
        container.append(dom.createTitle(stage.name));

        const groupWrapper = document.createElement('div');
        groupWrapper.classList.add('group__wrapper');
        container.append(groupWrapper);

        let groupNumber = 1;
        for (const groupMatches of matchesByGroup) {
            const groupId = groupMatches[0].group_id;
            const groupContainer = dom.createGroupContainer(groupId, lang.getGroupName(groupNumber++));
            const matchesByRound = splitBy(groupMatches, 'round_id');
            const roundWrapper = document.createElement('div');
            roundWrapper.classList.add('round__wrapper');

            let roundNumber = 1;

            for (const roundMatches of matchesByRound) {
                const roundId = roundMatches[0].round_id;
                const roundContainer = dom.createRoundContainer(roundId, `Game ${roundNumber++}`);

                for (const match of roundMatches)
                    roundContainer.append(this.createFFAMatch(match));


                roundWrapper.append(roundContainer);
            }

            groupContainer.append(roundWrapper);
            groupWrapper.append(groupContainer);
        }

        root.append(container);
    }

    /**
     * Renders an elimination stage (single or double).
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderElimination(root: DocumentFragment, stage: Stage, matchesByGroup: Match[][]): void {
        const container = dom.createStageContainer(stage.id, 'elimination');
        container.append(dom.createTitle(stage.name));

        if (stage.type === 'single_elimination')
            this.renderSingleElimination(container, matchesByGroup);
        else
            this.renderDoubleElimination(container, matchesByGroup);

        root.append(container);
    }

    /**
     * Renders a single elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderSingleElimination(container: HTMLElement, matchesByGroup: Match[][]): void {
        const hasFinal = matchesByGroup[1] !== undefined;
        this.renderBracket(container, splitBy(matchesByGroup[0], 'round_id'), lang.getRoundName, 'single-bracket');

        if (hasFinal)
            this.renderFinal(container, 'consolation_final', matchesByGroup[1]);
    }

    /**
     * Renders a double elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderDoubleElimination(container: HTMLElement, matchesByGroup: Match[][]): void {
        const hasLoserBracket = matchesByGroup[1] !== undefined;
        const hasFinal = matchesByGroup[2] !== undefined;

        this.renderBracket(container, splitBy(matchesByGroup[0], 'round_id'), lang.getWinnerBracketRoundName, 'winner-bracket', hasFinal);

        if (hasLoserBracket)
            this.renderBracket(container, splitBy(matchesByGroup[1], 'round_id'), lang.getLoserBracketRoundName, 'loser-bracket');

        if (hasFinal)
            this.renderFinal(container, 'grand_final', matchesByGroup[2]);
    }

    /**
     * Renders a bracket.
     *
     * @param container The container to render into.
     * @param matchesByRound A list of matches for each round.
     * @param roundName A function giving a round's name based on its number.
     * @param bracketType Type of the bracket.
     * @param connectFinal Whether to connect the last match of the bracket to the final.
     */
    private renderBracket(container: HTMLElement, matchesByRound: Match[][], roundName: RoundName, bracketType: BracketType, connectFinal?: boolean): void {
        const groupId = matchesByRound[0][0].group_id;
        const roundCount = matchesByRound.length;
        const bracketContainer = dom.createStageContainer(groupId, 'bracket');

        let roundNumber = 1;

        for (const matches of matchesByRound) {
            const roundId = matches[0].round_id;
            const roundContainer = dom.createRoundContainer(roundId, roundName(roundNumber, roundCount));

            for (const match of matches)
                roundContainer.append(this.createBracketMatch(roundNumber, roundCount, match, bracketType, connectFinal));

            bracketContainer.append(roundContainer);
            roundNumber++;
        }

        container.append(bracketContainer);
    }

    /**
     * Renders a final group.
     *
     * @param container The container to render into.
     * @param finalType Type of the final.
     * @param matches Matches of the final.
     */
    private renderFinal(container: HTMLElement, finalType: FinalType, matches: Match[]): void {
        const upperBracket = container.querySelector('.bracket');
        if (!upperBracket) throw Error('Upper bracket not found.');

        const winnerWb = matches[0].opponent1;
        const displayCount = winnerWb?.id === null || winnerWb?.result === 'win' ? 1 : 2;
        const finalMatches = matches.slice(0, displayCount);

        const roundCount = matches.length;

        for (let roundIndex = 0; roundIndex < finalMatches.length; roundIndex++) {
            const roundNumber = roundIndex + 1;
            const roundContainer = dom.createRoundContainer(finalMatches[roundIndex].round_id, lang.getFinalMatchLabel(finalType, roundNumber, roundCount));
            roundContainer.append(this.createFinalMatch(finalType, finalMatches, roundNumber, roundCount));
            upperBracket.append(roundContainer);
        }
    }

    /**
     * Creates a ranking table based on matches of a round-robin stage.
     *
     * @param matches The list of matches.
     */
    private createRanking(matches: Match[]): HTMLElement {
        const table = dom.createTable();
        const ranking = getRanking(matches);

        table.append(dom.createRankingHeaders(ranking));

        for (const item of ranking)
            table.append(this.createRankingRow(item));

        return table;
    }

    /**
     * Creates a row of the ranking table.
     *
     * @param item Item of the ranking.
     */
    private createRankingRow(item: RankingItem): HTMLElement {
        const row = dom.createRow();
        const notRanked = item.played === 0;

        for (const key in item) {
            const prop = key as keyof RankingItem;
            const data = item[prop];

            if (prop === 'id') {
                const participant = this.participants.find(participant => participant.id === data);

                if (participant !== undefined) {
                    const cell = dom.createCell(participant.name);
                    this.setupMouseHover(participant.id, cell);
                    row.append(cell);
                    continue;
                }
            }

            if (notRanked && (prop === 'rank' || prop === 'points')) {
                row.append(dom.createCell('-'));
                continue;
            }

            row.append(dom.createCell(data));
        }

        return row;
    }

    /**
     * Creates a match in a bracket.
     *
     * @param roundNumber Number of the round.
     * @param roundCount Count of rounds.
     * @param match Information about the match.
     * @param matchLocation Location of the match.
     * @param connectFinal Whether to connect this match to the final if it happens to be the last one of the bracket.
     */
    private createBracketMatch(roundNumber: number, roundCount: number, match: Match, matchLocation: BracketType, connectFinal?: boolean): HTMLElement {
        const connection = dom.getBracketConnection(roundNumber, roundCount, matchLocation, connectFinal);
        const matchLabel = lang.getMatchLabel(match.number, roundNumber, roundCount, matchLocation) + (match.child_count > 0 ? `, Bo${match.child_count}` : '');
        const originHint = lang.getOriginHint(roundNumber, roundCount, this.skipFirstRound, matchLocation);
        return this.createMatch(match, matchLocation, connection, matchLabel, originHint, roundNumber);
    }

    /**
     * Creates a match in a final.
     *
     * @param type Type of the final.
     * @param matches Matches of the final.
     * @param roundNumber Number of the round.
     * @param roundCount Count of rounds.
     */
    private createFinalMatch(type: FinalType, matches: Match[], roundNumber: number, roundCount: number): HTMLElement {
        const roundIndex = roundNumber - 1;
        const connection = dom.getFinalConnection(type, roundNumber, matches.length);
        const matchLabel = lang.getFinalMatchLabel(type, roundNumber, roundCount);
        const originHint = lang.getFinalOriginHint(type, roundNumber);
        return this.createMatch(matches[roundIndex], 'final-group', connection, matchLabel, originHint);
    }

    /**
     * Creates a match based on its results.
     *
     * @param match Results of the match.
     * @param matchLocation Location of the match.
     * @param connection Connection of this match with the others.
     * @param label Label of the match.
     * @param originHint Origin hint for the match.
     * @param roundNumber Number of the round.
     */
    private createMatch(match: Match, matchLocation?: BracketType, connection?: Connection, label?: string, originHint?: OriginHint, roundNumber?: number): HTMLElement {
        const matchContainer = dom.createMatchContainer(match.id, match.status);
        const opponents = dom.createOpponentsContainer();

        const participant1 = this.createParticipant(match.opponent1, originHint, matchLocation, roundNumber);
        const participant2 = this.createParticipant(match.opponent2, originHint, matchLocation, roundNumber);

        if (label) {
            if (match.child_count > 0 && !this.config.separatedChildCountLabel)
                label += `, ${lang.bestOfX(match.child_count)}`;

            opponents.append(dom.createMatchLabel(label, lang.getMatchStatus(match.status)));
        }

        if (match.child_count > 0 && this.config.separatedChildCountLabel)
            opponents.append(dom.createChildCountLabel(lang.bestOfX(match.child_count)));

        opponents.append(participant1, participant2);
        matchContainer.append(opponents);

        if (!connection)
            return matchContainer;

        dom.setupConnection(opponents, matchContainer, connection);

        return matchContainer;
    }

    /**
     * Creates a match based on its results.
     *
     * @param match Results of the match.
     * @param matchLocation Location of the match.
     * @param connection Connection of this match with the others.
     * @param label Label of the match.
     * @param originHint Origin hint for the match.
     * @param roundNumber Number of the round.
     */
    private createFFAMatch(match: FFAMatch, matchLocation?: BracketType, connection?: Connection, label?: string, originHint?: OriginHint, roundNumber?: number): HTMLElement {
        const matchContainer = dom.createFFAMatchContainer(match.id, match.status);
        const opponents = dom.createOpponentsContainer();
        const participants:HTMLElement[] = [];
        // display the participants
        if (match.participants.length > 0) {
            match.participants.forEach((participant) => {
                const participantElement = this.createParticipant(participant, originHint, matchLocation, roundNumber);
                participants.push(participantElement);
            });
        }

        for (let i = participants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = participants[i];
            participants[i] = participants[j];
            participants[j] = temp;
        }

        opponents.append(...participants);
        matchContainer.append(opponents);

        if (!connection)
            return matchContainer;

        dom.setupConnection(opponents, matchContainer, connection);

        return matchContainer;
    }

    /**
     * Creates a participant for a match.
     *
     * @param participant Information about the participant.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private createParticipant(participant: ParticipantResult | null, originHint: OriginHint, matchLocation?: BracketType, roundNumber?: number): HTMLElement {
        const containers: ParticipantContainers = {
            participant: dom.createParticipantContainer(participant && participant.id),
            name: dom.createNameContainer(),
            result: dom.createResultContainer(),
        };

        if (participant === null)
            containers.name.innerText = lang.BYE;
        else {
            console.log('rendering participant');
            this.renderParticipant(containers, participant, originHint, matchLocation, roundNumber);
        }

        containers.participant.append(containers.name, containers.result);

        if (participant && participant.id !== null)
            this.setupMouseHover(participant.id, containers.participant);

        return containers.participant;
    }

    /**
     * Renders a participant.
     *
     * @param containers Containers for the participant.
     * @param participant The participant result.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private renderParticipant(containers: ParticipantContainers, participant: ParticipantResult, originHint: OriginHint, matchLocation?: BracketType, roundNumber?: number): void {
        const found = this.participants.find(item => item.id === participant.id);

        if (found) {
            containers.name.innerText = found.name;
            containers.participant.setAttribute('title', found.name);
            this.renderParticipantImage(containers.name, found.id);
            this.renderParticipantOrigin(containers.name, participant, matchLocation, roundNumber);
        } else
            this.renderHint(containers.name, participant, originHint, matchLocation);

        containers.result.innerText = `${participant.score === undefined ? '-' : participant.score}`;

        dom.setupWin(containers.participant, containers.result, participant);
        dom.setupLoss(containers.participant, containers.result, participant);
    }

    /**
     * Renders a participant image.
     *
     * @param nameContainer The name container.
     * @param participantId ID of the participant.
     */
    private renderParticipantImage(nameContainer: HTMLElement, participantId: number): void {
        const found = this.participantImages.find(item => item.participantId === participantId);
        if (found) dom.addParticipantImage(nameContainer, found.imageUrl);
    }

    /**
     * Renders an origin hint for a participant.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param originHint Origin hint for the participant.
     * @param matchLocation Location of the match.
     */
    private renderHint(nameContainer: HTMLElement, participant: ParticipantResult, originHint: OriginHint, matchLocation?: BracketType): void {
        if (originHint === undefined || participant.position === undefined) return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser-bracket') return;

        dom.setupHint(nameContainer, originHint(participant.position));
    }

    /**
     * Renders a participant's origin.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private renderParticipantOrigin(nameContainer: HTMLElement, participant: ParticipantResult, matchLocation?: BracketType, roundNumber?: number): void {
        if (participant.position === undefined || matchLocation === undefined) return;
        if (!this.config.participantOriginPlacement || this.config.participantOriginPlacement === 'none') return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser-bracket') return;

        const abbreviation = getOriginAbbreviation(matchLocation, this.skipFirstRound, roundNumber);
        console.log('abbreviation: ', abbreviation);
        const origin = abbreviation + participant.position;
        console.log('origin: ', origin);
        dom.addParticipantOrigin(nameContainer, origin, this.config.participantOriginPlacement);
    }

    /**
     * Sets mouse hover events for a participant.
     *
     * @param participantId ID of the participant.
     * @param element The dom element to add events to.
     */
    private setupMouseHover(participantId: number, element: HTMLElement): void {
        if (!this.config.highlightParticipantOnHover) return;

        const refs = this.participantRefs[participantId];
        if (!refs) throw Error(`The participant (id: ${participantId}) does not exist in the participants table.`);

        refs.push(element);

        // https://flaviocopes.com/how-to-add-event-listener-multiple-elements-javascript/
        // Use bubbling to have only one callback

        element.addEventListener('mouseover', () => {
            refs.forEach(el => el.classList.add('hover'));
        });

        element.addEventListener('mouseleave', () => {
            refs.forEach(el => el.classList.remove('hover'));
        });
    }
}

window.bracketsViewer = new BracketsViewer();
