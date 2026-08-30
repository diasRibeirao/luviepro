export type QuoteStatus='draft'|'approved'|'sent'|'rejected';
export type QuoteStatusChange=Exclude<QuoteStatus,'approved'>;

export type QuoteClientSummary={name:string};
export type QuoteRecord={id:string;number:string;status:QuoteStatus;createdAt:string;validUntil?:string|null;totalCents:number;finalTotalCents?:number|null;client:QuoteClientSummary};

export type QuoteStage={description:string};
export type QuoteItemConfiguration={serviceId?:string;dailyRateCents?:number;variableCostCents?:number;fixedCostCents?:number;safetyMarginBps?:number};
export type QuoteItem={id:string;serviceName:string;days:number;people:number;totalCents:number;stages?:QuoteStage[];configurationJson?:QuoteItemConfiguration|null};
export type QuoteClient={name:string};
export type QuoteDetailData={id:string;number:string;status:string;version?:number;discountBps?:number;validityDays?:number;notes?:string|null;publicToken?:string|null;validUntil?:string|null;sentAt?:string|null;clientDecision?:'approved'|'rejected'|null;clientDecisionName?:string|null;finalTotalCents?:number|null;totalCents:number;client:QuoteClient;items:QuoteItem[]};
export type QuoteVersion={id:string;version:number;createdAt:string};
export type TimelineEvent={type:string;at:string;title:string;detail?:string|null};
export type ShareInfo={token?:string;path:string;url:string;validUntil?:string|null};
export type DuplicateQuoteResponse={id:string;number:string};
export type ShareResponse={token?:string;path:string;validUntil?:string|null};
export type EditQuoteItem={serviceId:string;days:string;people:string;dailyRateCents?:number;variableCostCents?:number;fixedCostCents?:number;safetyMarginBps?:number};

export type ServiceTeamMember={role:string;dailyRateCents:number;included?:boolean};
export type ServiceCost={description:string;amountCents:number;type:'variable'|'fixed'|string};
export type QuoteServiceStage={description?:string;duration?:string|null};
export type QuoteServiceOption={id:string;name:string;code?:string|null;description?:string|null;active?:boolean;defaultDays?:number|null;people?:number|null;dailyRateCents:number;variableCostCents?:number;fixedCostCents?:number;safetyMarginBps?:number;team?:ServiceTeamMember[];costs?:ServiceCost[];stages?:QuoteServiceStage[]};
export type QuoteClientOption={id:string;name:string;city?:string|null;phone?:string|null;email?:string|null};

export type PricingRequest={dailyRateCents:number;days:number;people:number;variableCostCents:number;fixedCostCents:number;safetyMarginBps:number};
export type PricingResult={totalCents:number;[key:string]:unknown};

export type QuoteAccountTenant={proposalValidityDays?:number|null};
export type QuoteWizardAccount={tenant?:QuoteAccountTenant|null};

export type CreateQuoteItemPayload={serviceId:string;days:number;people:number;dailyRateCents:number;variableCostCents:number;fixedCostCents:number;safetyMarginBps:number};
export type CreateQuotePayload={clientId:string;discountBps:number;validityDays:number;notes:string;items:CreateQuoteItemPayload[]};
export type UpdateQuotePayload={discountBps?:number;validityDays?:number;notes?:string;items?:Array<{serviceId:string;days:number;people:number;dailyRateCents?:number;variableCostCents?:number;fixedCostCents?:number;safetyMarginBps?:number}>};

export type ProposalItem={id:string;serviceName:string;days:number;people:number;totalCents:number};
export type ProposalClient={name:string;document?:string|null;city?:string|null;state?:string|null;addressLine?:string|null;addressNumber?:string|null;neighborhood?:string|null};
export type ProposalData={number:string;createdAt:string;client:ProposalClient;items:ProposalItem[];validityDays:number;finalTotalCents?:number|null;totalCents:number;discountBps:number;notes?:string|null};
export type TenantData={name:string;logoUrl?:string|null;document?:string|null;contactEmail?:string|null;phone?:string|null;addressLine?:string|null;addressNumber?:string|null;city?:string|null;state?:string|null;proposalText?:string|null;proposalPaymentTerms?:string|null;pixKey?:string|null;responsibleName?:string|null;siteUrl?:string|null;instagram?:string|null;proposalFooter?:string|null};
export type AccountData=TenantData&{tenant?:TenantData|null};
