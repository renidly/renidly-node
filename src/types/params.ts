/**
 * GENERATED — do not edit by hand; regenerate from the API specs.
 *
 * Typed filter parameters for the search / list / discover methods. Data-API
 * filters use the API's snake_case names; Live-API filters use camelCase.
 */

export interface ActivityDetailsParams {
  entityId?: string;
}

export interface ActivityFeedParams {
  entityId?: string;
  cursor?: string;
  start?: number;
}

export interface ActivityReactionsParams {
  entityId?: string;
  start?: number;
}

export interface ActivityRepliesByAuthorParams {
  entityId?: string;
  cursor?: string;
  start?: number;
}

export interface ActivityRepliesParams {
  entityId?: string;
  sortBy?: string;
  count?: number;
  start?: number;
}

export interface CompaniesBatchEnrichParams {
  job_id?: string;
  after?: number;
}

export interface CompaniesCompanyParams {
  id?: string;
  slug?: string;
}

export interface CompaniesEmployeesParams {
  current_only?: boolean;
  title?: string;
  geo_country_code?: string;
  geo_city?: string;
  start_year?: number;
  start_month?: number;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export interface CompaniesSearchParams {
  name?: string;
  website?: string;
  staff_count_min?: number;
  staff_count_max?: number;
  follower_count_min?: number;
  follower_count_max?: number;
  industries?: string;
  industries_v2?: string;
  hq_city?: string;
  hq_country_code?: string;
  founded?: number;
  cursor?: string;
  limit?: number;
}

export interface DiscoverOpportunitiesParams {
  keyword?: string;
  sortBy?: string;
  datePosted?: string;
  experience?: string;
  jobTypes?: string;
  workplaceTypes?: string;
  salary?: string;
  companies?: string;
  industries?: string;
  locations?: string;
  functions?: string;
  titles?: string;
  benefits?: string;
  commitments?: string;
  easyApply?: string;
  verifiedJob?: string;
  under10Applicants?: string;
  fairChance?: string;
  count?: number;
  start?: number;
}

export interface DiscoverOrganizationsParams {
  keyword?: string;
  headcountRange?: string;
  industry?: string;
  geoEntityId?: string;
  hasJobs?: string;
  count?: number;
  start?: number;
}

export interface DiscoverPeopleParams {
  keyword?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  currentCompany?: string;
  pastCompany?: string;
  school?: string;
  industry?: string;
  geoEntityId?: string;
  profileLanguage?: string;
  serviceCategory?: string;
  count?: number;
  start?: number;
}

export interface FindBatchParams {
  job_id?: string;
  after?: number;
}

export interface FindLinkedinParams {
  url?: string;
}

export interface FindParams {
  first_name?: string;
  last_name?: string;
  domain?: string;
}

export interface InstitutionsAlumniParams {
  current_only?: boolean;
  degree?: string;
  field_of_study?: string;
  start_year_min?: number;
  start_year_max?: number;
  end_year_min?: number;
  end_year_max?: number;
  geo_country_code?: string;
  geo_city?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface InstitutionsInstitutionParams {
  normalized_name?: string;
}

export interface InstitutionsSearchParams {
  name?: string;
  page?: number;
  limit?: number;
}

export interface JobChangesSearchParams {
  event_type?: string;
  organization_ids?: string;
  geo_city?: string;
  geo_country_code?: string;
  title?: string;
  days_ago?: number;
  page?: number;
  limit?: number;
}

export interface OpportunityByPersonParams {
  personEntityId?: string;
  count?: number;
  start?: number;
}

export interface OpportunityDetailsParams {
  opportunityEntityId?: string;
}

export interface OpportunityHiringTeamParams {
  opportunityEntityId?: string;
}

export interface OpportunityRelatedViewsParams {
  opportunityEntityId?: string;
}

export interface OpportunitySimilarParams {
  opportunityEntityId?: string;
}

export interface OrganizationActivitiesParams {
  id?: string;
  start?: number;
}

export interface OrganizationAffiliatedParams {
  id?: string;
}

export interface OrganizationEnrichParams {
  id?: string;
}

export interface OrganizationHeadcountParams {
  id?: string;
}

export interface OrganizationOpportunitiesParams {
  organizationEntityIds?: string;
  start?: number;
}

export interface OrganizationResolveSlugParams {
  slug?: string;
}

export interface OrganizationSimilarParams {
  id?: string;
}

export interface PeopleBatchEnrichParams {
  job_id?: string;
  after?: number;
}

export interface PeopleProfileParams {
  id?: string;
  handle?: string;
}

export interface PeopleSearchParams {
  first_name?: string;
  last_name?: string;
  headline?: string;
  summary?: string;
  geo_city?: string;
  geo_country_code?: string;
  is_creator?: boolean;
  is_premium?: boolean;
  primary_language?: string;
  skills?: string;
  skills_match?: string;
  organization_slugs?: string;
  current_only?: boolean;
  title?: string;
  institution_ids?: string;
  certifications?: string;
  certification_authority?: string;
  last_change_within_days?: number;
  last_change_type?: string;
  tenure_min_years?: number;
  tenure_max_years?: number;
  company_count_min?: number;
  company_count_max?: number;
  current_company_count_min?: number;
  is_boomerang?: boolean;
  education_level?: string;
  degree?: string;
  field_of_study?: string;
  skill_count_min?: number;
  skill_count_max?: number;
  speaks_language?: string;
  cursor?: string;
  limit?: number;
}

export interface PersonEmploymentHistoryParams {
  entityId?: string;
}

export interface PersonEndorsementsParams {
  entityId?: string;
}

export interface PersonEnrichParams {
  entityId?: string;
  handle?: string;
}

export interface PersonInterestsParams {
  entityId?: string;
}

export interface PersonLookalikesParams {
  entityId?: string;
}

export interface PersonResolveHandleParams {
  handle?: string;
}

export interface ProspectsParams {
  domain?: string;
  kind?: string;
  cursor?: string;
}

export interface ReverseParams {
  email?: string;
}

export interface SkillsSearchParams {
  name?: string;
  page?: number;
  limit?: number;
}

export interface SkillsSkillParams {
  id?: string;
}

export interface VerifyBatchParams {
  job_id?: string;
  after?: number;
}

export interface VerifyParams {
  email?: string;
}
