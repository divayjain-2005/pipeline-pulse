import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface Deal {
    id: bigint;
    activityPrior30Days: bigint;
    owner: string;
    stakeholders: Array<Stakeholder>;
    name: string;
    createdDate: bigint;
    closeDatePushes: bigint;
    lastActivityDate: bigint;
    expectedCloseDate: bigint;
    stage: DealStage;
    notes: string;
    account: string;
    activityLast30Days: bigint;
    amount: bigint;
}
export interface DealRisk {
    signals: Array<RiskSignal>;
    explanation: string;
    dealId: bigint;
    score: number;
    recommendedAction: string;
    topReason: string;
    bucket: RiskBucket;
    explanationGeneratedAt?: bigint;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Forecast {
    low: bigint;
    byOwner: Array<ForecastBreakdown>;
    computedAt: bigint;
    rationaleGeneratedAt?: bigint;
    high: bigint;
    byRiskBucket: Array<ForecastBreakdown>;
    byStage: Array<ForecastBreakdown>;
    confidenceLabel: string;
    rangeBasis: string;
    rationale: string;
    naivePipeline: bigint;
    repCommitEstimate: bigint;
    mostLikely: bigint;
}
export interface ForecastBreakdown {
    key: string;
    totalValue: bigint;
    weightedValue: bigint;
    caption: string;
    dealCount: bigint;
}
export interface HistoricalBaseline {
    forecastErrorPct: number;
    overallWinRate: number;
    avgDealCycleDays: number;
    stageStats: Array<StageStats>;
    closedDealCount: bigint;
}
export type PipelineError = {
    __kind__: "notAuthorized";
    notAuthorized: null;
} | {
    __kind__: "invalidInput";
    invalidInput: string;
} | {
    __kind__: "notFound";
    notFound: bigint;
};
export type PipelineResult = {
    __kind__: "ok";
    ok: Deal;
} | {
    __kind__: "err";
    err: PipelineError;
};
export type PipelineResult_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: PipelineError;
};
export type PipelineResult_2 = {
    __kind__: "ok";
    ok: Forecast;
} | {
    __kind__: "err";
    err: PipelineError;
};
export type PipelineResult_3 = {
    __kind__: "ok";
    ok: DealRisk;
} | {
    __kind__: "err";
    err: PipelineError;
};
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface RiskSignal {
    weight: number;
    code: string;
    detail: string;
    caption: string;
    contribution: number;
}
export interface StageStats {
    totalValue: bigint;
    weightedValue: bigint;
    stage: DealStage;
    dealCount: bigint;
    avgDaysInStage: number;
    winRate: number;
}
export interface Stakeholder {
    name: string;
    role: StakeholderRole;
    lastContacted: bigint;
    engagement: EngagementLevel;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum DealStage {
    prospecting = "prospecting",
    closedWon = "closedWon",
    proposal = "proposal",
    negotiation = "negotiation",
    qualification = "qualification",
    closedLost = "closedLost"
}
export enum EngagementLevel {
    low = "low",
    high = "high",
    none = "none",
    medium = "medium"
}
export enum RiskBucket {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum StakeholderRole {
    economicBuyer = "economicBuyer",
    blocker = "blocker",
    procurement = "procurement",
    champion = "champion",
    technicalEvaluator = "technicalEvaluator"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addStakeholder(dealId: bigint, stakeholder: Stakeholder): Promise<PipelineResult>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDeal(deal: Deal): Promise<PipelineResult>;
    deleteDeal(id: bigint): Promise<PipelineResult_1>;
    execute(qJson: string): Promise<Result>;
    generateDealReasoning(dealId: bigint): Promise<PipelineResult_3>;
    generateForecastRationale(): Promise<PipelineResult_2>;
    getApiDoc(): Promise<string>;
    getBaseline(): Promise<HistoricalBaseline>;
    getCallerUserRole(): Promise<UserRole>;
    getDeal(id: bigint): Promise<Deal | null>;
    getDealReasoning(dealId: bigint): Promise<DealRisk | null>;
    getForecast(): Promise<Forecast>;
    getForecastRationale(): Promise<{
        generatedAt: bigint;
        text: string;
    } | null>;
    isCallerAdmin(): Promise<boolean>;
    listDealRisks(): Promise<Array<DealRisk>>;
    listDeals(): Promise<Array<Deal>>;
    resetSampleData(): Promise<PipelineResult_1>;
    schema(): Promise<string>;
    /**
     * / Replaces all pipeline state with the deterministic synthetic dataset.
     */
    seedSampleData(): Promise<void>;
    storeAddStakeholder(dealId: bigint, stakeholder: Stakeholder): Promise<PipelineResult>;
    storeBaseline(): Promise<HistoricalBaseline>;
    storeCreateDeal(deal: Deal): Promise<PipelineResult>;
    storeDeleteDeal(id: bigint): Promise<PipelineResult_1>;
    storeGetDeal(id: bigint): Promise<Deal | null>;
    storeListDeals(): Promise<Array<Deal>>;
    storeUpdateDeal(id: bigint, deal: Deal): Promise<PipelineResult>;
    storeUpdateStakeholder(dealId: bigint, stakeholderIndex: bigint, stakeholder: Stakeholder): Promise<PipelineResult>;
    updateDeal(id: bigint, deal: Deal): Promise<PipelineResult>;
    updateStakeholder(dealId: bigint, stakeholderIndex: bigint, stakeholder: Stakeholder): Promise<PipelineResult>;
}
