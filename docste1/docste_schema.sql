--
-- PostgreSQL database dump
--

-- Dumped from database version 15.7
-- Dumped by pg_dump version 15.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_unique_documents_modified(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_unique_documents_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE unique_documents
  SET modified = CURRENT_TIMESTAMP
  WHERE id = NEW.document_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_unique_documents_modified() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actions (
    id integer NOT NULL,
    name character varying(128),
    name_native character varying(128)
);


ALTER TABLE public.actions OWNER TO postgres;

--
-- Name: actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.actions_id_seq OWNER TO postgres;

--
-- Name: actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.actions_id_seq OWNED BY public.actions.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    action_id integer,
    description character varying(512),
    description_native character varying(512)
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(256) NOT NULL,
    name_native character varying(256),
    role character varying(16)
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_participating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_participating (
    id integer NOT NULL,
    company_id integer,
    project_id integer
);


ALTER TABLE public.company_participating OWNER TO postgres;

--
-- Name: company_participating_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_participating_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_participating_id_seq OWNER TO postgres;

--
-- Name: company_participating_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_participating_id_seq OWNED BY public.company_participating.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(256) NOT NULL,
    name_native character varying(256),
    company_id integer
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: disciplines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disciplines (
    id integer NOT NULL,
    code character varying(16),
    name character varying(256) NOT NULL,
    name_native character varying(256),
    department_id integer
);


ALTER TABLE public.disciplines OWNER TO postgres;

--
-- Name: disciplines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disciplines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.disciplines_id_seq OWNER TO postgres;

--
-- Name: disciplines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disciplines_id_seq OWNED BY public.disciplines.id;


--
-- Name: document_prefixes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_prefixes (
    id integer NOT NULL,
    prefix character varying(16)
);


ALTER TABLE public.document_prefixes OWNER TO postgres;

--
-- Name: document_prefixes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_prefixes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_prefixes_id_seq OWNER TO postgres;

--
-- Name: document_prefixes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_prefixes_id_seq OWNED BY public.document_prefixes.id;


--
-- Name: document_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_revisions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified timestamp with time zone,
    deleted integer DEFAULT 0,
    status_id integer NOT NULL,
    step_id integer NOT NULL,
    description_id integer,
    number character varying(8),
    user_id integer,
    remarks text
);


ALTER TABLE public.document_revisions OWNER TO postgres;

--
-- Name: document_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_revisions_id_seq OWNER TO postgres;

--
-- Name: document_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_revisions_id_seq OWNED BY public.document_revisions.id;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_types (
    id integer NOT NULL,
    code character varying(16),
    name character varying(256),
    name_native character varying(256)
);


ALTER TABLE public.document_types OWNER TO postgres;

--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_types_id_seq OWNER TO postgres;

--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified timestamp with time zone,
    deleted integer DEFAULT 0,
    number character varying(128) NOT NULL,
    title character varying(512) NOT NULL,
    title_native character varying(512),
    remarks text,
    project_id integer,
    discipline_id integer NOT NULL,
    type_id integer NOT NULL,
    revision_status_id integer NOT NULL,
    revision_step_id integer NOT NULL,
    language_id integer,
    revision_description_id integer,
    revision_number character varying(8),
    folder_id integer,
    user_id integer,
    drs character varying(128),
    revision_date date,
    issued_date_customer date,
    issued_date_contractor date,
    due_date date
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: languages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.languages (
    id integer NOT NULL,
    name character varying(512) NOT NULL,
    name_native character varying(512)
);


ALTER TABLE public.languages OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    number character varying(128) NOT NULL,
    name character varying(512) NOT NULL,
    name_native character varying(512)
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: revision_descriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revision_descriptions (
    id integer NOT NULL,
    code character varying(16) NOT NULL,
    description character varying(512),
    description_native character varying(512),
    phase character varying(16)
);


ALTER TABLE public.revision_descriptions OWNER TO postgres;

--
-- Name: revision_statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revision_statuses (
    id integer NOT NULL,
    name character varying(32) NOT NULL,
    name_native character varying(32)
);


ALTER TABLE public.revision_statuses OWNER TO postgres;

--
-- Name: revision_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revision_steps (
    id integer NOT NULL,
    code character varying(16),
    description character varying(512),
    description_native character varying(512),
    description_long text
);


ALTER TABLE public.revision_steps OWNER TO postgres;

--
-- Name: documents_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.documents_view AS
 SELECT d.id,
    d.number AS document_number,
    d.title AS document_title,
    d.title_native AS document_title_native,
    d.remarks,
    p.name AS project,
    di.name AS discipline,
    dt.name AS document_type,
    rs1.name AS revision_status,
    rs2.description AS revision_step,
    l.name AS language,
    rd.description AS revision_description,
    d.revision_number,
    to_char(d.created, 'YYYY-MM-DD HH24:MI:SS'::text) AS created,
    (d.modified)::timestamp without time zone AS modified,
    d.drs,
    d.revision_date,
    d.issued_date_customer,
    d.issued_date_contractor,
    d.due_date
   FROM (((((((public.documents d
     LEFT JOIN public.projects p ON ((p.id = d.project_id)))
     LEFT JOIN public.disciplines di ON ((di.id = d.discipline_id)))
     LEFT JOIN public.document_types dt ON ((dt.id = d.type_id)))
     LEFT JOIN public.revision_statuses rs1 ON ((rs1.id = d.revision_status_id)))
     LEFT JOIN public.revision_steps rs2 ON ((rs2.id = d.revision_step_id)))
     LEFT JOIN public.languages l ON ((l.id = d.language_id)))
     LEFT JOIN public.revision_descriptions rd ON ((rd.id = d.revision_description_id)))
  WHERE ((d.deleted = 0) AND ((rs1.name)::text <> 'Superseded'::text));


ALTER TABLE public.documents_view OWNER TO postgres;

--
-- Name: facilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facilities (
    id integer NOT NULL,
    name character varying(512) NOT NULL,
    name_native character varying(512)
);


ALTER TABLE public.facilities OWNER TO postgres;

--
-- Name: facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.facilities_id_seq OWNER TO postgres;

--
-- Name: facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facilities_id_seq OWNED BY public.facilities.id;


--
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folders (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    project_id integer NOT NULL,
    deleted integer DEFAULT 0
);


ALTER TABLE public.folders OWNER TO postgres;

--
-- Name: folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.folders_id_seq OWNER TO postgres;

--
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.languages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.languages_id_seq OWNER TO postgres;

--
-- Name: languages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;


--
-- Name: originators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.originators (
    id integer NOT NULL,
    name character varying(512) NOT NULL
);


ALTER TABLE public.originators OWNER TO postgres;

--
-- Name: originators_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.originators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.originators_id_seq OWNER TO postgres;

--
-- Name: originators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.originators_id_seq OWNED BY public.originators.id;


--
-- Name: project_description_step_reference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_description_step_reference (
    id integer NOT NULL,
    project_id integer,
    description_id integer,
    step_id integer
);


ALTER TABLE public.project_description_step_reference OWNER TO postgres;

--
-- Name: project_description_step_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_description_step_reference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_description_step_reference_id_seq OWNER TO postgres;

--
-- Name: project_description_step_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_description_step_reference_id_seq OWNED BY public.project_description_step_reference.id;


--
-- Name: project_discipline_doctype_reference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_discipline_doctype_reference (
    id integer NOT NULL,
    project_id integer,
    discipline_id integer,
    type_id integer
);


ALTER TABLE public.project_discipline_doctype_reference OWNER TO postgres;

--
-- Name: project_discipline_doctype_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_discipline_doctype_reference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_discipline_doctype_reference_id_seq OWNER TO postgres;

--
-- Name: project_discipline_doctype_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_discipline_doctype_reference_id_seq OWNED BY public.project_discipline_doctype_reference.id;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: review_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_codes (
    id integer NOT NULL,
    code character varying(16) NOT NULL,
    name character varying(32) NOT NULL,
    name_native character varying(32)
);


ALTER TABLE public.review_codes OWNER TO postgres;

--
-- Name: review_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.review_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.review_codes_id_seq OWNER TO postgres;

--
-- Name: review_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.review_codes_id_seq OWNED BY public.review_codes.id;


--
-- Name: revision_descriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revision_descriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.revision_descriptions_id_seq OWNER TO postgres;

--
-- Name: revision_descriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revision_descriptions_id_seq OWNED BY public.revision_descriptions.id;


--
-- Name: revision_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revision_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.revision_statuses_id_seq OWNER TO postgres;

--
-- Name: revision_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revision_statuses_id_seq OWNED BY public.revision_statuses.id;


--
-- Name: revision_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revision_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.revision_steps_id_seq OWNER TO postgres;

--
-- Name: revision_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revision_steps_id_seq OWNED BY public.revision_steps.id;


--
-- Name: transmittal_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transmittal_revisions (
    id integer NOT NULL,
    transmittal_id integer,
    revision_id integer NOT NULL
);


ALTER TABLE public.transmittal_revisions OWNER TO postgres;

--
-- Name: transmittal_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transmittal_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transmittal_revisions_id_seq OWNER TO postgres;

--
-- Name: transmittal_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transmittal_revisions_id_seq OWNED BY public.transmittal_revisions.id;


--
-- Name: transmittals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transmittals (
    id integer NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified timestamp with time zone,
    deleted integer DEFAULT 0,
    user_id integer,
    transmittal_number character varying(128) NOT NULL,
    type character varying(10) NOT NULL,
    issued date NOT NULL,
    due_date date,
    party_id integer NOT NULL,
    idc date,
    originator_id integer,
    review_code_id integer,
    responded date,
    contractor_responded date,
    remarks text,
    waiting_response_from_id integer,
    CONSTRAINT transmittals_type_check CHECK (((type)::text = ANY (ARRAY[('Outgoing'::character varying)::text, ('Incoming'::character varying)::text])))
);


ALTER TABLE public.transmittals OWNER TO postgres;

--
-- Name: transmittals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transmittals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transmittals_id_seq OWNER TO postgres;

--
-- Name: transmittals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transmittals_id_seq OWNED BY public.transmittals.id;


--
-- Name: unique_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unique_documents (
    id integer NOT NULL,
    number character varying(128) NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified timestamp with time zone,
    deleted integer DEFAULT 0,
    title character varying(512) NOT NULL,
    title_native character varying(512),
    project_id integer,
    discipline_id integer NOT NULL,
    type_id integer NOT NULL,
    language_id integer,
    drs character varying(128),
    originator_id integer
);


ALTER TABLE public.unique_documents OWNER TO postgres;

--
-- Name: unique_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unique_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unique_documents_id_seq OWNER TO postgres;

--
-- Name: unique_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unique_documents_id_seq OWNED BY public.unique_documents.id;


--
-- Name: uploaded_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uploaded_files (
    id integer NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified timestamp with time zone,
    deleted integer DEFAULT 0,
    path character varying(2048),
    revision_id integer
);


ALTER TABLE public.uploaded_files OWNER TO postgres;

--
-- Name: uploaded_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.uploaded_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.uploaded_files_id_seq OWNER TO postgres;

--
-- Name: uploaded_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.uploaded_files_id_seq OWNED BY public.uploaded_files.id;


--
-- Name: user_project_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_project_access (
    id integer NOT NULL,
    user_id integer,
    project_id integer
);


ALTER TABLE public.user_project_access OWNER TO postgres;

--
-- Name: user_project_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_project_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_project_access_id_seq OWNER TO postgres;

--
-- Name: user_project_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_project_access_id_seq OWNED BY public.user_project_access.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    name character varying(64) NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    password character varying(64) NOT NULL,
    email character varying(64),
    role_id integer NOT NULL,
    department_id integer,
    active integer DEFAULT 1
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_participating id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_participating ALTER COLUMN id SET DEFAULT nextval('public.company_participating_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: disciplines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplines ALTER COLUMN id SET DEFAULT nextval('public.disciplines_id_seq'::regclass);


--
-- Name: document_prefixes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_prefixes ALTER COLUMN id SET DEFAULT nextval('public.document_prefixes_id_seq'::regclass);


--
-- Name: document_revisions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_revisions ALTER COLUMN id SET DEFAULT nextval('public.document_revisions_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: facilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facilities ALTER COLUMN id SET DEFAULT nextval('public.facilities_id_seq'::regclass);


--
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- Name: languages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('public.languages_id_seq'::regclass);


--
-- Name: originators id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.originators ALTER COLUMN id SET DEFAULT nextval('public.originators_id_seq'::regclass);


--
-- Name: project_description_step_reference id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_description_step_reference ALTER COLUMN id SET DEFAULT nextval('public.project_description_step_reference_id_seq'::regclass);


--
-- Name: project_discipline_doctype_reference id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_discipline_doctype_reference ALTER COLUMN id SET DEFAULT nextval('public.project_discipline_doctype_reference_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: review_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_codes ALTER COLUMN id SET DEFAULT nextval('public.review_codes_id_seq'::regclass);


--
-- Name: revision_descriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_descriptions ALTER COLUMN id SET DEFAULT nextval('public.revision_descriptions_id_seq'::regclass);


--
-- Name: revision_statuses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_statuses ALTER COLUMN id SET DEFAULT nextval('public.revision_statuses_id_seq'::regclass);


--
-- Name: revision_steps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_steps ALTER COLUMN id SET DEFAULT nextval('public.revision_steps_id_seq'::regclass);


--
-- Name: transmittal_revisions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transmittal_revisions ALTER COLUMN id SET DEFAULT nextval('public.transmittal_revisions_id_seq'::regclass);


--
-- Name: transmittals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transmittals ALTER COLUMN id SET DEFAULT nextval('public.transmittals_id_seq'::regclass);


--
-- Name: unique_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unique_documents ALTER COLUMN id SET DEFAULT nextval('public.unique_documents_id_seq'::regclass);


--
-- Name: uploaded_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files ALTER COLUMN id SET DEFAULT nextval('public.uploaded_files_id_seq'::regclass);


--
-- Name: user_project_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_project_access ALTER COLUMN id SET DEFAULT nextval('public.user_project_access_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_participating company_participating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_participating
    ADD CONSTRAINT company_participating_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: disciplines disciplines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplines
    ADD CONSTRAINT disciplines_pkey PRIMARY KEY (id);


--
-- Name: document_prefixes document_prefixes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_prefixes
    ADD CONSTRAINT document_prefixes_pkey PRIMARY KEY (id);


--
-- Name: document_revisions document_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_revisions
    ADD CONSTRAINT document_revisions_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pk PRIMARY KEY (id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: originators originators_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.originators
    ADD CONSTRAINT originators_pkey PRIMARY KEY (id);


--
-- Name: project_description_step_reference project_description_step_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_description_step_reference
    ADD CONSTRAINT project_description_step_reference_pkey PRIMARY KEY (id);


--
-- Name: project_discipline_doctype_reference project_discipline_doctype_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_discipline_doctype_reference
    ADD CONSTRAINT project_discipline_doctype_reference_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: review_codes review_codes_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_codes
    ADD CONSTRAINT review_codes_pk PRIMARY KEY (id);


--
-- Name: revision_descriptions revision_descriptions_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_descriptions
    ADD CONSTRAINT revision_descriptions_pk PRIMARY KEY (id);


--
-- Name: revision_statuses revision_statuses_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_statuses
    ADD CONSTRAINT revision_statuses_pk PRIMARY KEY (id);


--
-- Name: revision_steps revision_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_steps
    ADD CONSTRAINT revision_steps_pkey PRIMARY KEY (id);


--
-- Name: transmittal_revisions transmittal_revisions_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transmittal_revisions
    ADD CONSTRAINT transmittal_revisions_pkey1 PRIMARY KEY (id);


--
-- Name: transmittals transmittals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transmittals
    ADD CONSTRAINT transmittals_pkey PRIMARY KEY (id);


--
-- Name: transmittals transmittals_unique_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transmittals
    ADD CONSTRAINT transmittals_unique_number UNIQUE (transmittal_number);


--
-- Name: unique_documents unique_documents_document_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unique_documents
    ADD CONSTRAINT unique_documents_document_number_key UNIQUE (number);


--
-- Name: unique_documents unique_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unique_documents
    ADD CONSTRAINT unique_documents_pkey PRIMARY KEY (id);


--
-- Name: project_description_step_reference unique_project_description_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_description_step_reference
    ADD CONSTRAINT unique_project_description_step UNIQUE (project_id, description_id, step_id);


--
-- Name: project_discipline_doctype_reference unique_project_discipline_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_discipline_doctype_reference
    ADD CONSTRAINT unique_project_discipline_type UNIQUE (project_id, discipline_id, type_id);


--
-- Name: uploaded_files uploaded_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);


--
-- Name: user_project_access user_project_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_project_access
    ADD CONSTRAINT user_project_access_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_actions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_actions_id ON public.actions USING btree (id);


--
-- Name: ix_audit_logs_action_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_action_id ON public.audit_logs USING btree (action_id);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_companies_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_companies_id ON public.companies USING btree (id);


--
-- Name: ix_company_participating_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_company_participating_company_id ON public.company_participating USING btree (company_id);


--
-- Name: ix_company_participating_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_company_participating_id ON public.company_participating USING btree (id);


--
-- Name: ix_company_participating_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_company_participating_project_id ON public.company_participating USING btree (project_id);


--
-- Name: ix_departments_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_departments_company_id ON public.departments USING btree (company_id);


--
-- Name: ix_departments_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_departments_id ON public.departments USING btree (id);


--
-- Name: ix_disciplines_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_disciplines_id ON public.disciplines USING btree (id);


--
-- Name: ix_document_prefixes_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_document_prefixes_id ON public.document_prefixes USING btree (id);


--
-- Name: ix_document_types_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_document_types_id ON public.document_types USING btree (id);


--
-- Name: ix_documents_discipline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_discipline_id ON public.documents USING btree (discipline_id);


--
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- Name: ix_documents_language_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_language_id ON public.documents USING btree (language_id);


--
-- Name: ix_documents_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_number ON public.documents USING btree (number);


--
-- Name: ix_documents_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: ix_documents_revision_status_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_revision_status_id ON public.documents USING btree (revision_status_id);


--
-- Name: ix_documents_revision_step_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_revision_step_id ON public.documents USING btree (revision_step_id);


--
-- Name: ix_documents_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_type_id ON public.documents USING btree (type_id);


--
-- Name: ix_facilities_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_facilities_id ON public.facilities USING btree (id);


--
-- Name: ix_languages_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_languages_id ON public.languages USING btree (id);


--
-- Name: ix_originators_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_originators_id ON public.originators USING btree (id);


--
-- Name: ix_project_discipline_doctype_reference_discipline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_project_discipline_doctype_reference_discipline_id ON public.project_discipline_doctype_reference USING btree (discipline_id);


--
-- Name: ix_project_discipline_doctype_reference_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_project_discipline_doctype_reference_id ON public.project_discipline_doctype_reference USING btree (id);


--
-- Name: ix_project_discipline_doctype_reference_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_project_discipline_doctype_reference_project_id ON public.project_discipline_doctype_reference USING btree (project_id);


--
-- Name: ix_project_discipline_doctype_reference_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_project_discipline_doctype_reference_type_id ON public.project_discipline_doctype_reference USING btree (type_id);


--
-- Name: ix_projects_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_projects_id ON public.projects USING btree (id);


--
-- Name: ix_revision_steps_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_revision_steps_id ON public.revision_steps USING btree (id);


--
-- Name: ix_uploaded_files_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_uploaded_files_id ON public.uploaded_files USING btree (id);


--
-- Name: ix_uploaded_files_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_uploaded_files_path ON public.uploaded_files USING btree (path);


--
-- Name: ix_user_project_access_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_project_access_id ON public.user_project_access USING btree (id);


--
-- Name: ix_user_roles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_roles_id ON public.user_roles USING btree (id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: document_revisions trigger_update_unique_documents_modified; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_unique_documents_modified AFTER INSERT OR DELETE OR UPDATE ON public.document_revisions FOR EACH ROW EXECUTE FUNCTION public.update_unique_documents_modified();


--
-- Name: document_revisions update_modified_document_revisions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_modified_document_revisions BEFORE UPDATE ON public.document_revisions FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: documents update_modified_documents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_modified_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: transmittals update_modified_transmittals; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_modified_transmittals BEFORE UPDATE ON public.transmittals FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: unique_documents update_modified_unique_documents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_modified_unique_documents BEFORE UPDATE ON public.unique_documents FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: uploaded_files update_modified_uploaded_files; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_modified_uploaded_files BEFORE UPDATE ON public.uploaded_files FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- PostgreSQL database dump complete
--

