-- =====================================================================
-- 0001 — Punto de partida: lo que ya existía en la base
--
-- Esta migración NO se corre. Es la foto del esquema tal como estaba el 23 de
-- agosto de 2026, antes de que existiera esta carpeta. Se guarda para que la
-- historia empiece en algún lado y para que cualquiera pueda ver de dónde se
-- partió. En la base real quedó marcada como ya aplicada.
--
-- Lo que muestra esta foto, y que la 0002 corrige: cuatro políticas dejaban
-- escribir a cualquiera sin sesión, `messages` estaba abierta de par en par, y
-- todas las tablas tenían permiso completo para el rol anónimo.
-- =====================================================================




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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."care_searches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_name" "text" NOT NULL,
    "pathologies_required" "jsonb",
    "schedule_type" "text",
    "grid_schedule_7x3" "jsonb",
    "status" "text" DEFAULT 'activa'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."care_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."caregivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "dni" "text",
    "phone" "text",
    "email" "text",
    "profession" "text",
    "zone" "text",
    "pathologies" "jsonb",
    "tasks" "jsonb",
    "documents" "jsonb",
    "verification_status" "text" DEFAULT 'en_revision'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "tenant_id" "uuid",
    "cuit" "text",
    "address" "text",
    "bank_info" "text",
    "reference_info" "jsonb",
    "education_info" "jsonb",
    "birthdate" "date",
    "gender" "text",
    "nationality" "text",
    "hourly_rate" numeric
);


ALTER TABLE "public"."caregivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clock_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "caregiver_id" "uuid",
    "latitude" double precision,
    "longitude" double precision,
    "event_type" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."clock_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "search_id" "uuid",
    "caregiver_id" "uuid",
    "blood_pressure" "text",
    "glycemia" "text",
    "medications_administered" "jsonb",
    "daily_notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."logbook_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid",
    "search_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "full_name" "text",
    "role" "text" DEFAULT 'familiar'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "primary_color" "text" DEFAULT '#1A365D'::"text",
    "accent_color" "text" DEFAULT '#E53E3E'::"text",
    "logo_url" "text",
    "status" "text" DEFAULT 'activo'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."care_searches"
    ADD CONSTRAINT "care_searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caregivers"
    ADD CONSTRAINT "caregivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clock_ins"
    ADD CONSTRAINT "clock_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_messages_created" ON "public"."messages" USING "btree" ("created_at" DESC);



ALTER TABLE ONLY "public"."care_searches"
    ADD CONSTRAINT "care_searches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."caregivers"
    ADD CONSTRAINT "caregivers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clock_ins"
    ADD CONSTRAINT "clock_ins_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "public"."care_searches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "public"."care_searches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Anon insert caregivers" ON "public"."caregivers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anon insert clock_ins" ON "public"."clock_ins" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anon insert logbook" ON "public"."logbook_entries" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anon insert searches" ON "public"."care_searches" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anon update caregivers" ON "public"."caregivers" FOR UPDATE USING (true);



CREATE POLICY "Own profile" ON "public"."profiles" USING (("id" = "auth"."uid"()));



CREATE POLICY "Public messages full" ON "public"."messages" USING (true) WITH CHECK (true);



CREATE POLICY "Public read approved caregivers" ON "public"."caregivers" FOR SELECT USING (("verification_status" = ANY (ARRAY['validado_prestadora'::"text", 'validado'::"text"])));



CREATE POLICY "Public read logbook" ON "public"."logbook_entries" FOR SELECT USING (true);



CREATE POLICY "Public read searches" ON "public"."care_searches" FOR SELECT USING (true);



CREATE POLICY "Public read tenants" ON "public"."tenants" FOR SELECT USING (true);



ALTER TABLE "public"."care_searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."caregivers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clock_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logbook_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."care_searches" TO "anon";
GRANT ALL ON TABLE "public"."care_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."care_searches" TO "service_role";



GRANT ALL ON TABLE "public"."caregivers" TO "anon";
GRANT ALL ON TABLE "public"."caregivers" TO "authenticated";
GRANT ALL ON TABLE "public"."caregivers" TO "service_role";



GRANT ALL ON TABLE "public"."clock_ins" TO "anon";
GRANT ALL ON TABLE "public"."clock_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."clock_ins" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_entries" TO "anon";
GRANT ALL ON TABLE "public"."logbook_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_entries" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































