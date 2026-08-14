// Domain model for the whole app.

export type TierName = 'quick' | 'standard' | 'thorough';
export type Measures = 'ability' | 'usage';
export type Tone = 'gentle' | 'balanced' | 'playful';

export interface TapBlock {
	n: number;
	int: number;
}

export interface TierInfo {
	label: string;
	/** rough standard error of measurement per channel, 0-100 scale */
	sem: number;
	mem: number;
	rhyme: number;
	rot: number;
	taps: TapBlock[];
}

export interface Dim {
	key: string;
	sub: string;
	glyph: string;
}

export interface LikertItem {
	text: string;
	measures: Measures;
	tiers: TierName[];
	note?: string;
	/** orthographic-imagery item: reported separately, excluded from channel scoring */
	ortho?: boolean;
}

export type PuzzleType = 'puzzle-visual' | 'puzzle-verbal' | 'puzzle-spatial' | 'puzzle-kinesthetic';

export type Question =
	| { dim: number; role: 'plane'; type: '2d-plane'; text: string; subtext: string }
	| { dim: number; role: 'likert'; type: 'likert-batch'; text: string; items: LikertItem[] }
	| { dim: number; role: 'vviq'; type: 'vviq'; title: string }
	| { dim: number; role: 'puzzle'; type: PuzzleType; title: string };

// --- Answers ---
export interface PlaneAnswer {
	capacity: number;
	usage: number;
}
export interface LikertAnswer {
	values: (number | null)[];
}
export interface VviqAnswer {
	score: number;
	/** mapped onto the published 16-80 VVIQ scale */
	vviq: number;
	detail: string;
}
export interface PuzzleAnswer {
	score: number;
	detail: string;
	medRT?: number | null;
}
export interface KinBlockResult {
	int: number;
	err: number;
	signed: number;
}
export interface KinAnswer {
	score: number;
	avgError: number;
	meanSigned: number;
	intervals: number[];
	blocks: KinBlockResult[];
}
export type AnswerValue = PlaneAnswer | LikertAnswer | VviqAnswer | PuzzleAnswer | KinAnswer;
export type Answer = AnswerValue | 'N/A' | null;

/** [memDetail, rhymeDetail, rotDetail, kinErrMs, kinSignedMs, vviq16, ortho, rotMedRTms] */
export type ZSummary = (string | number | null)[];

export interface Sitting {
	d: string;
	t: TierName;
	a: number[];
	u: number[];
	e: number[];
	z: ZSummary;
}

export interface Profile {
	v: number;
	n: string;
	a: number[];
	u: number[];
	e: number[];
	z: ZSummary;
	h: number;
	t: TierName;
}

export interface RoomMember extends Profile {
	updated?: string;
}

// --- Results presentation ---
export interface StripSegment {
	from: number;
	to: number;
	label: string;
	tone: 'low' | 'lowmid' | 'mid' | 'high';
}
export interface Strip {
	min: number;
	max: number;
	value: number;
	error: number | null;
	valueLabel: string;
	axisLabel: string;
	segments: StripSegment[];
	marks?: { at: number; label: string }[];
}
export interface Anchor {
	dim: number;
	text: string;
	strip: Strip | null;
}
export interface AnchorData {
	anchors: Anchor[];
	ortho: { rating: number; text: string } | null;
}
export interface HeadlineFinding {
	dim: number;
	text: string;
}
export interface TitleDesc {
	title: string;
	desc: string;
}

// --- LLM narrative ---
export interface NarrativeItem {
	label: string;
	why: string;
}
export interface Narrative {
	title: string;
	description: string;
	strengths: NarrativeItem[];
	blindspots: NarrativeItem[];
	communication: { style: string; meet: string };
	cached?: boolean;
}

/** channel scores keyed by dim key ("Visual" | "Verbal" | "Spatial" | "Kinesthetic") */
export type ChannelScores = Record<string, number>;
