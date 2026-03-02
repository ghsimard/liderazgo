-- ============================================================
-- SEED SCRIPT for Render PostgreSQL
-- Run AFTER schema.sql to populate reference data
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADMIN USER
-- The admin user MUST be created via the setup script, NOT hardcoded here.
-- Run the following command to create your first admin:
--
--   node server/create-admin.js
--
-- This will prompt for email and password securely.
-- ============================================================

-- ============================================================
-- 2. DOMAINS 360
-- ============================================================
INSERT INTO domains_360 (id, key, label, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'gestion_personal', 'Gestión Personal', 1),
  ('d0000001-0000-0000-0000-000000000002', 'gestion_pedagogica', 'Gestión Pedagógica', 2),
  ('d0000001-0000-0000-0000-000000000003', 'gestion_administrativa_comunitaria', 'Gestión Administrativa y Comunitaria', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. COMPETENCIES 360
-- ============================================================
INSERT INTO competencies_360 (id, key, label, domain_id, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'autoconciencia', 'Autoconciencia', 'd0000001-0000-0000-0000-000000000001', 1),
  ('c0000001-0000-0000-0000-000000000002', 'emociones', 'Manejo de las emociones', 'd0000001-0000-0000-0000-000000000001', 2),
  ('c0000001-0000-0000-0000-000000000003', 'comunicacion', 'Comunicación asertiva', 'd0000001-0000-0000-0000-000000000001', 3),
  ('c0000001-0000-0000-0000-000000000004', 'colaborativo', 'Trabajo colaborativo', 'd0000001-0000-0000-0000-000000000001', 4),
  ('c0000001-0000-0000-0000-000000000005', 'direccion', 'Dirección del PEI', 'd0000001-0000-0000-0000-000000000002', 5),
  ('c0000001-0000-0000-0000-000000000006', 'orientacion', 'Orientación pedagógica', 'd0000001-0000-0000-0000-000000000002', 6),
  ('c0000001-0000-0000-0000-000000000007', 'convivencia', 'Convivencia', 'd0000001-0000-0000-0000-000000000002', 7),
  ('c0000001-0000-0000-0000-000000000008', 'evaluacion', 'Fomento de la cultura de la evaluación', 'd0000001-0000-0000-0000-000000000002', 8),
  ('c0000001-0000-0000-0000-000000000009', 'vision', 'Fomento de la visión compartida', 'd0000001-0000-0000-0000-000000000003', 9),
  ('c0000001-0000-0000-0000-000000000010', 'planeacion', 'Planeación institucional', 'd0000001-0000-0000-0000-000000000003', 10),
  ('c0000001-0000-0000-0000-000000000011', 'redes', 'Construcción de redes', 'd0000001-0000-0000-0000-000000000003', 11),
  ('c0000001-0000-0000-0000-000000000012', 'alianzas', 'Generación de alianzas', 'd0000001-0000-0000-0000-000000000003', 12),
  ('c0000001-0000-0000-0000-000000000013', 'rendicion', 'Rendición de cuentas', 'd0000001-0000-0000-0000-000000000003', 13)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. ITEMS 360 (39 items)
-- ============================================================
INSERT INTO items_360 (id, item_number, competency_key, response_type, sort_order) VALUES
  ('i0000001-0000-0000-0000-000000000001', 1, 'autoconciencia_2', 'frequency', 1),
  ('i0000001-0000-0000-0000-000000000002', 2, 'direccion_2', 'frequency', 2),
  ('i0000001-0000-0000-0000-000000000003', 3, 'vision_2', 'frequency', 3),
  ('i0000001-0000-0000-0000-000000000004', 4, 'autoconciencia_3', 'frequency', 4),
  ('i0000001-0000-0000-0000-000000000005', 5, 'direccion_3', 'frequency', 5),
  ('i0000001-0000-0000-0000-000000000006', 6, 'planeacion_2', 'frequency', 6),
  ('i0000001-0000-0000-0000-000000000007', 7, 'emociones_1', 'frequency', 7),
  ('i0000001-0000-0000-0000-000000000008', 8, 'orientacion_2', 'frequency', 8),
  ('i0000001-0000-0000-0000-000000000009', 9, 'planeacion_3', 'frequency', 9),
  ('i0000001-0000-0000-0000-000000000010', 10, 'emociones_2', 'frequency', 10),
  ('i0000001-0000-0000-0000-000000000011', 11, 'convivencia_3', 'frequency', 11),
  ('i0000001-0000-0000-0000-000000000012', 12, 'alianzas_2', 'frequency', 12),
  ('i0000001-0000-0000-0000-000000000013', 13, 'comunicacion_2', 'frequency', 13),
  ('i0000001-0000-0000-0000-000000000014', 14, 'evaluacion_2', 'frequency', 14),
  ('i0000001-0000-0000-0000-000000000015', 15, 'rendicion_2', 'frequency', 15),
  ('i0000001-0000-0000-0000-000000000016', 16, 'colaborativo_2', 'frequency', 16),
  ('i0000001-0000-0000-0000-000000000017', 17, 'evaluacion_3', 'frequency', 17),
  ('i0000001-0000-0000-0000-000000000018', 18, 'rendicion_3', 'frequency', 18),
  ('i0000001-0000-0000-0000-000000000019', 19, 'alianzas_1', 'agreement', 19),
  ('i0000001-0000-0000-0000-000000000020', 20, 'autoconciencia_1', 'agreement', 20),
  ('i0000001-0000-0000-0000-000000000021', 21, 'direccion_1', 'agreement', 21),
  ('i0000001-0000-0000-0000-000000000022', 22, 'vision_1', 'agreement', 22),
  ('i0000001-0000-0000-0000-000000000023', 23, 'alianzas_3', 'agreement', 23),
  ('i0000001-0000-0000-0000-000000000024', 24, 'emociones_3', 'agreement', 24),
  ('i0000001-0000-0000-0000-000000000025', 25, 'orientacion_1', 'agreement', 25),
  ('i0000001-0000-0000-0000-000000000026', 26, 'vision_3', 'agreement', 26),
  ('i0000001-0000-0000-0000-000000000027', 27, 'rendicion_1', 'agreement', 27),
  ('i0000001-0000-0000-0000-000000000028', 28, 'comunicacion_1', 'agreement', 28),
  ('i0000001-0000-0000-0000-000000000029', 29, 'orientacion_3', 'agreement', 29),
  ('i0000001-0000-0000-0000-000000000030', 30, 'planeacion_1', 'agreement', 30),
  ('i0000001-0000-0000-0000-000000000031', 31, 'comunicacion_3', 'agreement', 31),
  ('i0000001-0000-0000-0000-000000000032', 32, 'convivencia_1', 'agreement', 32),
  ('i0000001-0000-0000-0000-000000000033', 33, 'redes_1', 'agreement', 33),
  ('i0000001-0000-0000-0000-000000000034', 34, 'colaborativo_1', 'agreement', 34),
  ('i0000001-0000-0000-0000-000000000035', 35, 'convivencia_2', 'agreement', 35),
  ('i0000001-0000-0000-0000-000000000036', 36, 'redes_2', 'agreement', 36),
  ('i0000001-0000-0000-0000-000000000037', 37, 'colaborativo_3', 'agreement', 37),
  ('i0000001-0000-0000-0000-000000000038', 38, 'evaluacion_1', 'agreement', 38),
  ('i0000001-0000-0000-0000-000000000039', 39, 'redes_3', 'agreement', 39)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. ITEM TEXTS 360 (6 form types × 39 items = 234 rows)
-- ============================================================
-- Helper: insert texts by item_number referencing items_360
INSERT INTO item_texts_360 (item_id, form_type, text) VALUES
-- Item 1 (autoconciencia_2)
('i0000001-0000-0000-0000-000000000001', 'autoevaluacion', 'Utilizo y promuevo espacios de reflexión con mi equipo de trabajo (entrevistas, encuestas, reuniones y otros) para reconocer fortalezas y aspectos por mejorar respecto a nuestros roles en la IE.'),
('i0000001-0000-0000-0000-000000000001', 'directivo', 'Me convoca a participar en espacios de reflexión (entrevistas, encuestas, reuniones y otros), para que reconozcamos fortalezas y aspectos por mejorar respecto a nuestros roles en la IE.'),
('i0000001-0000-0000-0000-000000000001', 'docente', 'Me convoca a participar en espacios de reflexión (entrevistas, encuestas, reuniones y otros), para que reconozcamos fortalezas y aspectos por mejorar respecto a nuestros roles en la IE.'),
('i0000001-0000-0000-0000-000000000001', 'administrativo', 'Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio.'),
('i0000001-0000-0000-0000-000000000001', 'acudiente', 'Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio.'),
('i0000001-0000-0000-0000-000000000001', 'estudiante', 'Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio.'),
-- Item 2 (direccion_2)
('i0000001-0000-0000-0000-000000000002', 'autoevaluacion', 'Oriento con mi equipo de trabajo el desarrollo de los planes y proyectos pedagógicos del PEI.'),
('i0000001-0000-0000-0000-000000000002', 'directivo', 'Con nuestra participación, orienta el desarrollo de los planes y proyectos pedagógicos, atendiendo a las metas del PEI.'),
('i0000001-0000-0000-0000-000000000002', 'docente', 'Con nuestra ayuda, orienta el desarrollo de los planes y proyectos pedagógicos, atendiendo a las metas del PEI.'),
('i0000001-0000-0000-0000-000000000002', 'administrativo', 'Se reúne con docentes, directivos docentes y administrativos para orientar el desarrollo de los planes y proyectos que tienen para el colegio.'),
('i0000001-0000-0000-0000-000000000002', 'acudiente', 'Se reúne con docentes y directivos docentes para orientar los planes y proyectos que tienen para el colegio.'),
('i0000001-0000-0000-0000-000000000002', 'estudiante', 'Se reúne con docentes y directivos docentes para orientar los planes y proyectos que tienen para el colegio.'),
-- Item 3 (vision_2)
('i0000001-0000-0000-0000-000000000003', 'autoevaluacion', 'Con mi equipo de trabajo diseño estrategias para la construcción de la visión de la institución educativa.'),
('i0000001-0000-0000-0000-000000000003', 'directivo', 'En conjunto diseñamos estrategias para la construcción de una visión común de la institución educativa donde trabajamos.'),
('i0000001-0000-0000-0000-000000000003', 'docente', 'Con su equipo de trabajo diseña estrategias participativas para la construcción de una visión institucional conjunta.'),
('i0000001-0000-0000-0000-000000000003', 'administrativo', 'Con su equipo de trabajo diseña estrategias para la construcción de una visión institucional conjunta.'),
('i0000001-0000-0000-0000-000000000003', 'acudiente', 'Con su equipo de trabajo diseña estrategias para la construcción de una visión institucional conjunta.'),
('i0000001-0000-0000-0000-000000000003', 'estudiante', 'Con su equipo de trabajo diseña actividades para que entre toda la comunidad educativa construyamos la visión del colegio.'),
-- Item 4 (autoconciencia_3)
('i0000001-0000-0000-0000-000000000004', 'autoevaluacion', 'Promuevo espacios de reflexión para que todos los actores de la comunidad educativa identifiquen sus fortalezas y aspectos por mejorar.'),
('i0000001-0000-0000-0000-000000000004', 'directivo', 'Convoca a todos los actores de la comunidad educativa a participar en espacios de reflexión para que identifiquen sus fortalezas y aspectos por mejorar.'),
('i0000001-0000-0000-0000-000000000004', 'docente', 'Convoca a todos los actores de la comunidad educativa a participar en espacios de reflexión para que identifiquen sus fortalezas y aspectos por mejorar.'),
('i0000001-0000-0000-0000-000000000004', 'administrativo', 'Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como administrativo.'),
('i0000001-0000-0000-0000-000000000004', 'acudiente', 'Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como acudiente.'),
('i0000001-0000-0000-0000-000000000004', 'estudiante', 'Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como estudiante.'),
-- Item 5 (direccion_3)
('i0000001-0000-0000-0000-000000000005', 'autoevaluacion', 'Convoco a acudientes, estudiantes, administrativos y docentes para hacer seguimiento y evaluación a las metas establecidas en el PEI.'),
('i0000001-0000-0000-0000-000000000005', 'directivo', 'Convoca a acudientes, estudiantes, administrativos y docentes para que de manera participativa hagan el seguimiento y la evaluación de las metas establecidas en el PEI.'),
('i0000001-0000-0000-0000-000000000005', 'docente', 'Convoca a acudientes, estudiantes, administrativos y docentes para que de manera participativa hagan el seguimiento y la evaluación de las metas establecidas en el PEI.'),
('i0000001-0000-0000-0000-000000000005', 'administrativo', 'Me invita a participar en espacios para hacer seguimiento y evaluación a las metas que se proponen en el PEI del colegio.'),
('i0000001-0000-0000-0000-000000000005', 'acudiente', 'Me invita a participar en espacios para hacer seguimiento y evaluación a las metas que se proponen en el PEI del colegio.'),
('i0000001-0000-0000-0000-000000000005', 'estudiante', 'Me invita a participar en espacios para saber si cumplimos los objetivos de los planes y proyectos del colegio.'),
-- Item 6 (planeacion_2)
('i0000001-0000-0000-0000-000000000006', 'autoevaluacion', 'Diseño con mi equipo de trabajo estrategias de planeación participativa para el mejoramiento institucional.'),
('i0000001-0000-0000-0000-000000000006', 'directivo', 'Diseña conmigo estrategias de planeación participativa para el mejoramiento institucional.'),
('i0000001-0000-0000-0000-000000000006', 'docente', 'Diseña con su equipo de trabajo estrategias de planeación participativa para el mejoramiento institucional.'),
('i0000001-0000-0000-0000-000000000006', 'administrativo', 'Se reúne con sus docentes y directivos con el fin de diseñar estrategias de planeación para el mejoramiento institucional.'),
('i0000001-0000-0000-0000-000000000006', 'acudiente', 'Se reúne con sus docentes y directivos con el fin de diseñar estrategias de planeación para el mejoramiento institucional.'),
('i0000001-0000-0000-0000-000000000006', 'estudiante', 'Se reúne con docentes y directivos para diseñar estrategias de planeación con el fin de traer mejoras a mi colegio.'),
-- Item 7 (emociones_1)
('i0000001-0000-0000-0000-000000000007', 'autoevaluacion', 'Manifiesto mis emociones y reconozco su influencia en mi relación con otros.'),
('i0000001-0000-0000-0000-000000000007', 'directivo', 'Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo.'),
('i0000001-0000-0000-0000-000000000007', 'docente', 'Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo.'),
('i0000001-0000-0000-0000-000000000007', 'administrativo', 'Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo.'),
('i0000001-0000-0000-0000-000000000007', 'acudiente', 'Expresa sus emociones y sabe que la manera como lo hace impacta la relación que tiene conmigo.'),
('i0000001-0000-0000-0000-000000000007', 'estudiante', 'Expresa sus emociones y sabe que la manera como lo hace afecta la relación que tiene conmigo.'),
-- Item 8 (orientacion_2)
('i0000001-0000-0000-0000-000000000008', 'autoevaluacion', 'Convoco a mi equipo de trabajo para hacer reflexiones pedagógicas que permitan fortalecer las prácticas de la IE.'),
('i0000001-0000-0000-0000-000000000008', 'directivo', 'Me convoca a reflexiones pedagógicas para conocer experiencias transformadoras y fortalecer mis prácticas en la IE.'),
('i0000001-0000-0000-0000-000000000008', 'docente', 'Me convoca a reflexiones pedagógicas para conocer experiencias transformadoras y fortalecer mis prácticas en la IE.'),
('i0000001-0000-0000-0000-000000000008', 'administrativo', 'Se reúne los docentes y directivos docentes para reflexionar sobre las transformaciones que se dan en el colegio.'),
('i0000001-0000-0000-0000-000000000008', 'acudiente', 'Se reúne con docentes y directivos docentes para reflexionar sobre las transformaciones que se dan en el colegio.'),
('i0000001-0000-0000-0000-000000000008', 'estudiante', 'Se reúne con docentes y directivos docentes para reflexionar sobre cómo sus acciones transforman el colegio.'),
-- Item 9 (planeacion_3)
('i0000001-0000-0000-0000-000000000009', 'autoevaluacion', 'Utilizo estrategias para garantizar que docentes, estudiantes y acudientes participen en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000009', 'directivo', 'Utiliza estrategias para garantizar que docentes, estudiantes y acudientes participen en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000009', 'docente', 'Utiliza estrategias para garantizar que administrativos, estudiantes y acudientes participen en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000009', 'administrativo', 'Me convoca a participar en espacios para tomar decisiones sobre la planeación institucional.'),
('i0000001-0000-0000-0000-000000000009', 'acudiente', 'Me convoca a participar en espacios para tomar decisiones sobre la planeación institucional.'),
('i0000001-0000-0000-0000-000000000009', 'estudiante', 'Me invitan a participar en espacios para tomar decisiones sobre los planes y las metas que se quieren para mi colegio.'),
-- Item 10 (emociones_2)
('i0000001-0000-0000-0000-000000000010', 'autoevaluacion', 'Realizo actividades con mi equipo de trabajo orientadas a identificar las emociones que tenemos y cómo estas influyen en el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000010', 'directivo', 'Me invita a participar en actividades para identificar nuestras emociones y cómo estas influyen en el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000010', 'docente', 'Me invita a participar en actividades para identificar nuestras emociones y cómo estas influyen en el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000010', 'administrativo', 'Se reúne con docentes y directivos docentes para saber cómo manejar mejor sus emociones y así mejorar el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000010', 'acudiente', 'Se reúne con docentes, directivos docentes y administrativos para aprender a manejar mejor sus emociones y así mejorar el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000010', 'estudiante', 'Se reúne con docentes y directivos docentes para aprender a manejar mejor sus emociones y así mejorar el ambiente escolar.'),
-- Item 11 (convivencia_3)
('i0000001-0000-0000-0000-000000000011', 'autoevaluacion', 'Construyo con acudientes, docentes, directivos, estudiantes y administrativos los acuerdos de convivencia de la IE.'),
('i0000001-0000-0000-0000-000000000011', 'directivo', 'Convoca a docentes, directivos, acudientes, estudiantes y administrativos a construir los acuerdos de convivencia de la IE.'),
('i0000001-0000-0000-0000-000000000011', 'docente', 'Convoca a docentes, directivos, acudientes, estudiantes y administrativos a construir los acuerdos de convivencia de la IE.'),
('i0000001-0000-0000-0000-000000000011', 'administrativo', 'Me invita a participar en la construcción de los acuerdos de convivencia del colegio.'),
('i0000001-0000-0000-0000-000000000011', 'acudiente', 'Me invita a participar en la construcción de los acuerdos de convivencia del colegio.'),
('i0000001-0000-0000-0000-000000000011', 'estudiante', 'Me invita a participar en la construcción de los acuerdos de convivencia del colegio.'),
-- Item 12 (alianzas_2)
('i0000001-0000-0000-0000-000000000012', 'autoevaluacion', 'Identifico con mi equipo de trabajo la posibilidad de alianza con organizaciones, entidades, entre otros actores de mi territorio, para avanzar en la transformación institucional.'),
('i0000001-0000-0000-0000-000000000012', 'directivo', 'Identifica conmigo, como parte de su equipo de trabajo, posibilidades de alianza con organizaciones, entidades y otros actores del territorio para avanzar en la transformación institucional.'),
('i0000001-0000-0000-0000-000000000012', 'docente', 'Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en la transformación de la IE.'),
('i0000001-0000-0000-0000-000000000012', 'administrativo', 'Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en las mejoras que necesita el colegio.'),
('i0000001-0000-0000-0000-000000000012', 'acudiente', 'Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en las mejoras que necesita el colegio.'),
('i0000001-0000-0000-0000-000000000012', 'estudiante', 'Se reúne con docentes y directivos para mirar con qué organizaciones, empresas, entidades, etc., se puede realizar un trabajo conjunto con el fin de avanzar en las mejoras que mi colegio necesita.'),
-- Item 13 (comunicacion_2)
('i0000001-0000-0000-0000-000000000013', 'autoevaluacion', 'Uso estrategias con mi equipo de trabajo para garantizar una comunicación clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000013', 'directivo', 'Me convoca para construir acuerdos para que nuestra comunicación sea clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000013', 'docente', 'Me convoca para construir acuerdos para que nuestra comunicación sea clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000013', 'administrativo', 'Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000013', 'acudiente', 'Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000013', 'estudiante', 'Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa.'),
-- Item 14 (evaluacion_2)
('i0000001-0000-0000-0000-000000000014', 'autoevaluacion', 'Me reúno con mi equipo de trabajo para revisar la pertinencia de los procesos de evaluación de docentes y de estudiantes en relación con los objetivos de la IE.'),
('i0000001-0000-0000-0000-000000000014', 'directivo', 'Me convoca a revisar si los procesos de evaluación institucional, de docentes y de estudiantes son pertinentes con los objetivos del colegio.'),
('i0000001-0000-0000-0000-000000000014', 'docente', 'Me convoca a revisar si los procesos de evaluación institucional, de docentes y de estudiantes son pertinentes con los objetivos del colegio.'),
('i0000001-0000-0000-0000-000000000014', 'administrativo', 'Con los docentes y los directivos docentes revisan la pertinencia de la evaluación con los objetivos del colegio.'),
('i0000001-0000-0000-0000-000000000014', 'acudiente', 'Revisa con los docentes y los directivos la pertinencia de la evaluación con los objetivos del colegio.'),
('i0000001-0000-0000-0000-000000000014', 'estudiante', 'Se reúne con docentes y directivos para saber si la evaluación responde a lo que busca el colegio.'),
-- Item 15 (rendicion_2)
('i0000001-0000-0000-0000-000000000015', 'autoevaluacion', 'Realizo con mi equipo de trabajo una estrategia integral de rendición de cuentas que incluye los resultados académicos, la gestión institucional y la ejecución de recursos.'),
('i0000001-0000-0000-0000-000000000015', 'directivo', 'Me invita, como parte de su equipo de trabajo, a construir una estrategia conjunta de rendición de cuentas en la que se aborden los procesos pedagógicos y administrativos.'),
('i0000001-0000-0000-0000-000000000015', 'docente', 'Me invita a construir una estrategia conjunta de rendición de cuentas en la que se aborden los procesos pedagógicos y administrativos.'),
('i0000001-0000-0000-0000-000000000015', 'administrativo', 'En las rendiciones de cuentas del colegio muestra cómo le va los y las estudiantes, las actividades que se hacen en el colegio y el uso de los recursos que se tienen.'),
('i0000001-0000-0000-0000-000000000015', 'acudiente', 'En las rendiciones de cuentas del colegio muestra cómo le va los y las estudiantes, las actividades que se hacen en el colegio y el uso de los recursos que se tienen.'),
('i0000001-0000-0000-0000-000000000015', 'estudiante', 'Con docentes, administrativos y directivos planean cómo hacer la rendición de cuentas (resultados de los logros y retos del año).'),
-- Item 16 (colaborativo_2)
('i0000001-0000-0000-0000-000000000016', 'autoevaluacion', 'Implemento con mis equipos de trabajo principios y herramientas para trabajar de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000016', 'directivo', 'Implementa conmigo y sus demás colaboradores, principios y herramientas para trabajar de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000016', 'docente', 'Implementa conmigo y sus demás colaboradores, principios y herramientas para trabajar de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000016', 'administrativo', 'Implementa conmigo y su equipo principios y herramientas para trabajar de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000016', 'acudiente', 'Realiza actividades de manera colaborativa con sus equipos de trabajo.'),
('i0000001-0000-0000-0000-000000000016', 'estudiante', 'Realiza actividades de manera colaborativa con sus equipos de trabajo.'),
-- Item 17 (evaluacion_3)
('i0000001-0000-0000-0000-000000000017', 'autoevaluacion', 'Convoco a la comunidad educativa para revisar y ajustar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI.'),
('i0000001-0000-0000-0000-000000000017', 'directivo', 'Me convoca, como parte del equipo de trabajo, para revisar y acordar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI.'),
('i0000001-0000-0000-0000-000000000017', 'docente', 'Convoca a docentes, directivos, acudientes, estudiantes y administrativos para acordar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI.'),
('i0000001-0000-0000-0000-000000000017', 'administrativo', 'Me convoca a participar en espacios para tomar decisiones sobre los procesos de evaluación que se llevan a cabo en el colegio.'),
('i0000001-0000-0000-0000-000000000017', 'acudiente', 'Me convoca a participar en espacios para tomar decisiones sobre los procesos de evaluación de los aprendizajes de mis hijos o estudiantes a cargo.'),
('i0000001-0000-0000-0000-000000000017', 'estudiante', 'Me invita a participar en espacios para construir acuerdos y tomar decisiones sobre los procesos de evaluación de mi aprendizaje.'),
-- Item 18 (rendicion_3)
('i0000001-0000-0000-0000-000000000018', 'autoevaluacion', 'En el desarrollo de la rendición de cuentas, valoro la participación y tengo como referente los aportes de docentes, acudientes, estudiantes y administrativos.'),
('i0000001-0000-0000-0000-000000000018', 'directivo', 'La rendición de cuentas que lidera incluye los procesos pedagógicos y administrativos, contando con la participación de la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000018', 'docente', 'La rendición de cuentas que lidera incluye los procesos pedagógicos y administrativos, contando con la participación de la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000018', 'administrativo', 'Realiza el proceso de rendición de cuentas incluyendo los procesos pedagógicos y administrativos de la IE.'),
('i0000001-0000-0000-0000-000000000018', 'acudiente', 'La rendición de cuentas (resultados de los logros y retos del año) que hace sobre su gestión incluye los procesos pedagógicos y administrativos.'),
('i0000001-0000-0000-0000-000000000018', 'estudiante', 'La rendición de cuentas (resultados de los logros y retos del año) que hace sobre su gestión incluye los procesos pedagógicos y administrativos.'),
-- Item 19 (alianzas_1)
('i0000001-0000-0000-0000-000000000019', 'autoevaluacion', 'Reconozco la posibilidad de realizar alianzas con otras organizaciones, entidades y demás actores para aportar al logro de los objetivos institucionales.'),
('i0000001-0000-0000-0000-000000000019', 'directivo', 'Reconoce la posibilidad de realizar alianzas con organizaciones, entidades y otros actores para aportar al logro y desarrollo de los objetivos que se trazan en la IE.'),
('i0000001-0000-0000-0000-000000000019', 'docente', 'Reconoce las posibilidades de realizar alianzas con organizaciones, entidades y otros actores para aportar al logro y desarrollo de los objetivos que se trazan en la IE.'),
('i0000001-0000-0000-0000-000000000019', 'administrativo', 'Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio.'),
('i0000001-0000-0000-0000-000000000019', 'acudiente', 'Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio.'),
('i0000001-0000-0000-0000-000000000019', 'estudiante', 'Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio.'),
-- Item 20 (autoconciencia_1)
('i0000001-0000-0000-0000-000000000020', 'autoevaluacion', 'Dedico tiempo para reconocer qué fortalezas y oportunidades de mejora tengo en mi gestión como directivo docente.'),
('i0000001-0000-0000-0000-000000000020', 'directivo', 'Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente.'),
('i0000001-0000-0000-0000-000000000020', 'docente', 'Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente.'),
('i0000001-0000-0000-0000-000000000020', 'administrativo', 'Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente.'),
('i0000001-0000-0000-0000-000000000020', 'acudiente', 'Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente.'),
('i0000001-0000-0000-0000-000000000020', 'estudiante', 'Sabe cuáles son las cosas que hace bien y cuáles puede mejorar como directivo del colegio.'),
-- Item 21 (direccion_1)
('i0000001-0000-0000-0000-000000000021', 'autoevaluacion', 'Conozco la pertinencia del PEI frente a las necesidades y potencialidades del contexto.'),
('i0000001-0000-0000-0000-000000000021', 'directivo', 'Conoce la pertinencia del PEI frente a las necesidades y potencialidades del contexto.'),
('i0000001-0000-0000-0000-000000000021', 'docente', 'Conoce la pertinencia del PEI frente a las necesidades y potencialidades del contexto.'),
('i0000001-0000-0000-0000-000000000021', 'administrativo', 'Conoce la pertinencia del PEI frente a las necesidades y potencialidades del contexto.'),
('i0000001-0000-0000-0000-000000000021', 'acudiente', 'Conoce la pertinencia del PEI frente a las necesidades y potencialidades del contexto.'),
('i0000001-0000-0000-0000-000000000021', 'estudiante', 'Conoce la importancia del Proyecto Educativo Institucional (PEI) y las necesidades del colegio.'),
-- Item 22 (vision_1)
('i0000001-0000-0000-0000-000000000022', 'autoevaluacion', 'Comprendo la importancia de construir con la comunidad educativa una visión compartida de los procesos administrativos y pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000022', 'directivo', 'Comprende la importancia de construir con la comunidad educativa una visión compartida de los procesos administrativos y pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000022', 'docente', 'Comprende la importancia de construir con la comunidad educativa una visión compartida de los procesos administrativos y pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000022', 'administrativo', 'Comprende la importancia de construir con la comunidad educativa una visión compartida de los procesos administrativos y pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000022', 'acudiente', 'Comprende la importancia de construir con la comunidad educativa una visión compartida de los procesos administrativos y pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000022', 'estudiante', 'Entiende la importancia de que entre toda la comunidad educativa construyamos la visión del colegio.'),
-- Item 23 (alianzas_3)
('i0000001-0000-0000-0000-000000000023', 'autoevaluacion', 'Establezco alianzas con organizaciones, entidades y otros actores del territorio para fortalecer los procesos institucionales.'),
('i0000001-0000-0000-0000-000000000023', 'directivo', 'Establece alianzas con organizaciones, entidades y otros actores del territorio para fortalecer los procesos institucionales.'),
('i0000001-0000-0000-0000-000000000023', 'docente', 'Establece alianzas con organizaciones, entidades y otros actores del territorio para fortalecer los procesos institucionales.'),
('i0000001-0000-0000-0000-000000000023', 'administrativo', 'Establece alianzas con organizaciones, entidades y otros actores del territorio para fortalecer los procesos institucionales.'),
('i0000001-0000-0000-0000-000000000023', 'acudiente', 'Realiza alianzas con empresas, organizaciones, entre otros, para lograr las metas y logros que se proponen para mi colegio.'),
('i0000001-0000-0000-0000-000000000023', 'estudiante', 'Realiza alianzas con empresas, organizaciones, entre otros, para lograr las metas y logros que se proponen para mi colegio.'),
-- Item 24 (emociones_3)
('i0000001-0000-0000-0000-000000000024', 'autoevaluacion', 'Llevo a cabo estrategias para que los integrantes de la comunidad educativa puedan expresar de manera asertiva sus emociones.'),
('i0000001-0000-0000-0000-000000000024', 'directivo', 'Lleva a cabo estrategias para que los integrantes de la comunidad educativa puedan expresar de manera asertiva sus emociones.'),
('i0000001-0000-0000-0000-000000000024', 'docente', 'Lleva a cabo estrategias para que los integrantes de la comunidad educativa puedan expresar de manera asertiva sus emociones.'),
('i0000001-0000-0000-0000-000000000024', 'administrativo', 'Lleva a cabo estrategias para que los integrantes de la comunidad educativa puedan expresar de manera asertiva sus emociones.'),
('i0000001-0000-0000-0000-000000000024', 'acudiente', 'Realiza actividades para que los integrantes de la comunidad educativa puedan expresar sus emociones de la mejor manera posible.'),
('i0000001-0000-0000-0000-000000000024', 'estudiante', 'Realiza actividades para que los integrantes de la comunidad educativa puedan expresar sus emociones de la mejor manera posible.'),
-- Item 25 (orientacion_1)
('i0000001-0000-0000-0000-000000000025', 'autoevaluacion', 'Comprendo la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.'),
('i0000001-0000-0000-0000-000000000025', 'directivo', 'Comprende la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.'),
('i0000001-0000-0000-0000-000000000025', 'docente', 'Comprende la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.'),
('i0000001-0000-0000-0000-000000000025', 'administrativo', 'Comprende la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.'),
('i0000001-0000-0000-0000-000000000025', 'acudiente', 'Comprende la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.'),
('i0000001-0000-0000-0000-000000000025', 'estudiante', 'Entiende que las actividades de aprendizaje en el colegio son herramientas que transforman la comunidad y promueven la participación.'),
-- Item 26 (vision_3)
('i0000001-0000-0000-0000-000000000026', 'autoevaluacion', 'Construyo con los actores de la comunidad educativa la visión compartida de la IE que recoja los sueños de transformación institucional.'),
('i0000001-0000-0000-0000-000000000026', 'directivo', 'Construye con los actores de la comunidad educativa la visión compartida de la IE que recoja los sueños de transformación institucional.'),
('i0000001-0000-0000-0000-000000000026', 'docente', 'Construye con los actores de la comunidad educativa la visión compartida de la IE que recoja los sueños de transformación institucional.'),
('i0000001-0000-0000-0000-000000000026', 'administrativo', 'Construye con los actores de la comunidad educativa la visión compartida de la IE que recoja los sueños de transformación institucional.'),
('i0000001-0000-0000-0000-000000000026', 'acudiente', 'Me invita a participar en actividades para que entre todos los miembros de la comunidad educativa construyamos lo que soñamos para el colegio.'),
('i0000001-0000-0000-0000-000000000026', 'estudiante', 'Me invita a participar en actividades para que entre todos los miembros de la comunidad educativa construyamos lo que soñamos para el colegio.'),
-- Item 27 (rendicion_1)
('i0000001-0000-0000-0000-000000000027', 'autoevaluacion', 'Comprendo la rendición de cuentas como un proceso de diálogo abierto y transparente con la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000027', 'directivo', 'Comprende la rendición de cuentas como un proceso de diálogo abierto y transparente con la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000027', 'docente', 'Comprende la rendición de cuentas como un proceso de diálogo abierto y transparente con la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000027', 'administrativo', 'Comprende la rendición de cuentas como un proceso de diálogo abierto y transparente con la comunidad educativa.'),
('i0000001-0000-0000-0000-000000000027', 'acudiente', 'La rendición de cuentas (resultados de los logros y retos del año) que hace el directivo docente es un diálogo abierto y transparente con toda la comunidad.'),
('i0000001-0000-0000-0000-000000000027', 'estudiante', 'La rendición de cuentas (resultados de los logros y retos del año) que hace el directivo docente es un diálogo abierto y transparente con toda la comunidad.'),
-- Item 28 (comunicacion_1)
('i0000001-0000-0000-0000-000000000028', 'autoevaluacion', 'Reconozco que tengo fortalezas y oportunidades de mejora para comunicarme de manera asertiva.'),
('i0000001-0000-0000-0000-000000000028', 'directivo', 'Reconoce que tiene fortalezas y oportunidades de mejora para comunicarse de manera asertiva.'),
('i0000001-0000-0000-0000-000000000028', 'docente', 'Reconoce que tiene fortalezas y oportunidades de mejora para comunicarse de manera asertiva.'),
('i0000001-0000-0000-0000-000000000028', 'administrativo', 'Reconoce que tiene fortalezas y oportunidades de mejora para comunicarse de manera asertiva.'),
('i0000001-0000-0000-0000-000000000028', 'acudiente', 'Sabe que tiene fortalezas y cosas por mejorar para comunicarse de manera asertiva.'),
('i0000001-0000-0000-0000-000000000028', 'estudiante', 'Sabe que tiene fortalezas y cosas por mejorar para comunicarse de manera asertiva.'),
-- Item 29 (orientacion_3)
('i0000001-0000-0000-0000-000000000029', 'autoevaluacion', 'Promuevo la corresponsabilidad de los diferentes actores de la comunidad educativa en los procesos pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000029', 'directivo', 'Promueve la corresponsabilidad de los diferentes actores de la comunidad educativa en los procesos pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000029', 'docente', 'Promueve la corresponsabilidad de los diferentes actores de la comunidad educativa en los procesos pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000029', 'administrativo', 'Promueve la corresponsabilidad de los diferentes actores de la comunidad educativa en los procesos pedagógicos de la IE.'),
('i0000001-0000-0000-0000-000000000029', 'acudiente', 'Me invita a participar de las actividades pedagógicas del colegio.'),
('i0000001-0000-0000-0000-000000000029', 'estudiante', 'Me invita a participar de las actividades pedagógicas del colegio.'),
-- Item 30 (planeacion_1)
('i0000001-0000-0000-0000-000000000030', 'autoevaluacion', 'Comprendo la importancia de la participación de la comunidad en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000030', 'directivo', 'Comprende la importancia de la participación de la comunidad en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000030', 'docente', 'Comprende la importancia de la participación de la comunidad en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000030', 'administrativo', 'Comprende la importancia de la participación de la comunidad en los procesos de planeación institucional.'),
('i0000001-0000-0000-0000-000000000030', 'acudiente', 'Entiende la importancia de que la comunidad educativa participe en la planeación de las actividades del colegio.'),
('i0000001-0000-0000-0000-000000000030', 'estudiante', 'Entiende la importancia de que la comunidad educativa participe en la planeación de las actividades del colegio.'),
-- Item 31 (comunicacion_3)
('i0000001-0000-0000-0000-000000000031', 'autoevaluacion', 'Me comunico con la comunidad educativa utilizando herramientas de comunicación asertiva y desde un enfoque apreciativo.'),
('i0000001-0000-0000-0000-000000000031', 'directivo', 'Se comunica con la comunidad educativa utilizando herramientas de comunicación asertiva y desde un enfoque apreciativo.'),
('i0000001-0000-0000-0000-000000000031', 'docente', 'Se comunica con la comunidad educativa utilizando herramientas de comunicación asertiva y desde un enfoque apreciativo.'),
('i0000001-0000-0000-0000-000000000031', 'administrativo', 'Se comunica con la comunidad educativa utilizando herramientas de comunicación asertiva y desde un enfoque apreciativo.'),
('i0000001-0000-0000-0000-000000000031', 'acudiente', 'Se comunica conmigo de manera clara, directa y cuidadosa.'),
('i0000001-0000-0000-0000-000000000031', 'estudiante', 'Se comunica conmigo de manera clara, directa y cuidadosa.'),
-- Item 32 (convivencia_1)
('i0000001-0000-0000-0000-000000000032', 'autoevaluacion', 'Valoro las diferencias de los integrantes de la comunidad educativa como elemento que potencia el mejoramiento del ambiente escolar.'),
('i0000001-0000-0000-0000-000000000032', 'directivo', 'Valora las diferencias de los integrantes de la comunidad educativa como elemento que potencia el mejoramiento del ambiente escolar.'),
('i0000001-0000-0000-0000-000000000032', 'docente', 'Valora las diferencias de los integrantes de la comunidad educativa como elemento que potencia el mejoramiento del ambiente escolar.'),
('i0000001-0000-0000-0000-000000000032', 'administrativo', 'Valora las diferencias de los integrantes de la comunidad educativa como elemento que potencia el mejoramiento del ambiente escolar.'),
('i0000001-0000-0000-0000-000000000032', 'acudiente', 'Respeta y valora las diferencias de los integrantes de la comunidad educativa como algo que ayuda a mejorar el ambiente escolar.'),
('i0000001-0000-0000-0000-000000000032', 'estudiante', 'Respeta y valora las diferencias de los integrantes de la comunidad educativa como algo que ayuda a mejorar el ambiente escolar.'),
-- Item 33 (redes_1)
('i0000001-0000-0000-0000-000000000033', 'autoevaluacion', 'Reconozco que mi liderazgo y el de otros directivos docentes potencian el fortalecimiento de procesos institucionales y regionales.'),
('i0000001-0000-0000-0000-000000000033', 'directivo', 'Reconoce que su liderazgo y el de otros directivos docentes potencian el fortalecimiento de procesos institucionales y regionales.'),
('i0000001-0000-0000-0000-000000000033', 'docente', 'Reconoce que su liderazgo y el de otros directivos docentes potencian el fortalecimiento de procesos institucionales y regionales.'),
('i0000001-0000-0000-0000-000000000033', 'administrativo', 'Reconoce que su liderazgo y el de otros directivos docentes potencian el fortalecimiento de procesos institucionales y regionales.'),
('i0000001-0000-0000-0000-000000000033', 'acudiente', 'Reconoce que su liderazgo y el de otros directivos son importantes para mejorar el colegio y la región.'),
('i0000001-0000-0000-0000-000000000033', 'estudiante', 'Reconoce que su liderazgo y el de otros directivos son importantes para mejorar el colegio y la región.'),
-- Item 34 (colaborativo_1)
('i0000001-0000-0000-0000-000000000034', 'autoevaluacion', 'Reconozco que tengo fortalezas y oportunidades de mejora para trabajar de manera colaborativa en la IE.'),
('i0000001-0000-0000-0000-000000000034', 'directivo', 'Reconoce que tiene fortalezas y oportunidades de mejora para trabajar de manera colaborativa en la IE.'),
('i0000001-0000-0000-0000-000000000034', 'docente', 'Reconoce que tiene fortalezas y oportunidades de mejora para trabajar de manera colaborativa en la IE.'),
('i0000001-0000-0000-0000-000000000034', 'administrativo', 'Reconoce que tiene fortalezas y oportunidades de mejora para trabajar de manera colaborativa en la IE.'),
('i0000001-0000-0000-0000-000000000034', 'acudiente', 'Sabe que tiene fortalezas y cosas por mejorar a la hora de trabajar con otras personas del colegio.'),
('i0000001-0000-0000-0000-000000000034', 'estudiante', 'Sabe que tiene fortalezas y cosas por mejorar a la hora de trabajar con otras personas del colegio.'),
-- Item 35 (convivencia_2)
('i0000001-0000-0000-0000-000000000035', 'autoevaluacion', 'Construyo con mi equipo de trabajo acuerdos que reflejen la valoración de la diferencia como potencialidad.'),
('i0000001-0000-0000-0000-000000000035', 'directivo', 'Construye conmigo, como parte de su equipo de trabajo, acuerdos que reflejen la valoración de la diferencia como potencialidad.'),
('i0000001-0000-0000-0000-000000000035', 'docente', 'Construye con su equipo de trabajo acuerdos que reflejen la valoración de la diferencia como potencialidad.'),
('i0000001-0000-0000-0000-000000000035', 'administrativo', 'Construye con su equipo de trabajo acuerdos que reflejen la valoración de la diferencia como potencialidad.'),
('i0000001-0000-0000-0000-000000000035', 'acudiente', 'Construye con su equipo de trabajo acuerdos de convivencia que valoran las diferencias de cada persona.'),
('i0000001-0000-0000-0000-000000000035', 'estudiante', 'Construye con su equipo de trabajo acuerdos de convivencia que valoran las diferencias de cada persona.'),
-- Item 36 (redes_2)
('i0000001-0000-0000-0000-000000000036', 'autoevaluacion', 'Identifico con mi equipo de trabajo posibilidades de intercambio con otras IE para fortalecer los aprendizajes y la convivencia.'),
('i0000001-0000-0000-0000-000000000036', 'directivo', 'Identifica conmigo posibilidades de intercambio con otras IE para fortalecer los aprendizajes y la convivencia.'),
('i0000001-0000-0000-0000-000000000036', 'docente', 'Identifica con su equipo de trabajo posibilidades de intercambio con otras IE para fortalecer los aprendizajes y la convivencia.'),
('i0000001-0000-0000-0000-000000000036', 'administrativo', 'Identifica con su equipo de trabajo posibilidades de intercambio con otras IE para fortalecer los aprendizajes y la convivencia.'),
('i0000001-0000-0000-0000-000000000036', 'acudiente', 'Busca con su equipo de trabajo oportunidades para trabajar con otros colegios y así mejorar los aprendizajes y la convivencia.'),
('i0000001-0000-0000-0000-000000000036', 'estudiante', 'Busca con su equipo de trabajo oportunidades para trabajar con otros colegios y así mejorar los aprendizajes y la convivencia.'),
-- Item 37 (colaborativo_3)
('i0000001-0000-0000-0000-000000000037', 'autoevaluacion', 'Realizo actividades con la comunidad educativa en la que se trabaja de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000037', 'directivo', 'Realiza actividades con la comunidad educativa en la que se trabaja de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000037', 'docente', 'Realiza actividades con la comunidad educativa en la que se trabaja de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000037', 'administrativo', 'Realiza actividades con la comunidad educativa en la que se trabaja de manera colaborativa.'),
('i0000001-0000-0000-0000-000000000037', 'acudiente', 'Organiza actividades en las que toda la comunidad educativa trabaja de manera conjunta.'),
('i0000001-0000-0000-0000-000000000037', 'estudiante', 'Organiza actividades en las que toda la comunidad educativa trabaja de manera conjunta.'),
-- Item 38 (evaluacion_1)
('i0000001-0000-0000-0000-000000000038', 'autoevaluacion', 'Comprendo la evaluación como una herramienta de aprendizaje y mejora continua.'),
('i0000001-0000-0000-0000-000000000038', 'directivo', 'Comprende la evaluación como una herramienta de aprendizaje y mejora continua.'),
('i0000001-0000-0000-0000-000000000038', 'docente', 'Comprende la evaluación como una herramienta de aprendizaje y mejora continua.'),
('i0000001-0000-0000-0000-000000000038', 'administrativo', 'Comprende la evaluación como una herramienta de aprendizaje y mejora continua.'),
('i0000001-0000-0000-0000-000000000038', 'acudiente', 'Entiende la evaluación como una herramienta para aprender y mejorar continuamente.'),
('i0000001-0000-0000-0000-000000000038', 'estudiante', 'Entiende la evaluación como una herramienta para aprender y mejorar continuamente.'),
-- Item 39 (redes_3)
('i0000001-0000-0000-0000-000000000039', 'autoevaluacion', 'Conformo redes con otras IE para fortalecer los procesos de planeación de la IE.'),
('i0000001-0000-0000-0000-000000000039', 'directivo', 'Conforma redes con otras IE para fortalecer los procesos de planeación de la IE.'),
('i0000001-0000-0000-0000-000000000039', 'docente', 'Conforma redes con otras IE para fortalecer los procesos de planeación de la IE.'),
('i0000001-0000-0000-0000-000000000039', 'administrativo', 'Conforma redes con otras IE para fortalecer los procesos de planeación de la IE.'),
('i0000001-0000-0000-0000-000000000039', 'acudiente', 'Trabaja con otros colegios para mejorar los planes y proyectos de mi colegio.'),
('i0000001-0000-0000-0000-000000000039', 'estudiante', 'Trabaja con otros colegios para mejorar los planes y proyectos de mi colegio.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. COMPETENCY WEIGHTS (195 rows: 39 competency_items × 5 roles)
-- ============================================================
INSERT INTO competency_weights (competency_key, observer_role, weight) VALUES
-- autoconciencia
('autoconciencia_1', 'coor', 0.510), ('autoconciencia_1', 'doce', 0.340), ('autoconciencia_1', 'admi', 0.050), ('autoconciencia_1', 'acud', 0.050), ('autoconciencia_1', 'estu', 0.050),
('autoconciencia_2', 'coor', 0.300), ('autoconciencia_2', 'doce', 0.300), ('autoconciencia_2', 'admi', 0.200), ('autoconciencia_2', 'acud', 0.100), ('autoconciencia_2', 'estu', 0.100),
('autoconciencia_3', 'coor', 0.200), ('autoconciencia_3', 'doce', 0.200), ('autoconciencia_3', 'admi', 0.200), ('autoconciencia_3', 'acud', 0.200), ('autoconciencia_3', 'estu', 0.200),
-- emociones
('emociones_1', 'coor', 0.300), ('emociones_1', 'doce', 0.200), ('emociones_1', 'admi', 0.166), ('emociones_1', 'acud', 0.166), ('emociones_1', 'estu', 0.166),
('emociones_2', 'coor', 0.510), ('emociones_2', 'doce', 0.340), ('emociones_2', 'admi', 0.050), ('emociones_2', 'acud', 0.050), ('emociones_2', 'estu', 0.050),
('emociones_3', 'coor', 0.200), ('emociones_3', 'doce', 0.200), ('emociones_3', 'admi', 0.200), ('emociones_3', 'acud', 0.200), ('emociones_3', 'estu', 0.200),
-- comunicacion
('comunicacion_1', 'coor', 0.350), ('comunicacion_1', 'doce', 0.350), ('comunicacion_1', 'admi', 0.100), ('comunicacion_1', 'acud', 0.100), ('comunicacion_1', 'estu', 0.100),
('comunicacion_2', 'coor', 0.300), ('comunicacion_2', 'doce', 0.200), ('comunicacion_2', 'admi', 0.166), ('comunicacion_2', 'acud', 0.166), ('comunicacion_2', 'estu', 0.166),
('comunicacion_3', 'coor', 0.250), ('comunicacion_3', 'doce', 0.250), ('comunicacion_3', 'admi', 0.166), ('comunicacion_3', 'acud', 0.166), ('comunicacion_3', 'estu', 0.166),
-- colaborativo
('colaborativo_1', 'coor', 0.337), ('colaborativo_1', 'doce', 0.337), ('colaborativo_1', 'admi', 0.224), ('colaborativo_1', 'acud', 0.050), ('colaborativo_1', 'estu', 0.050),
('colaborativo_2', 'coor', 0.337), ('colaborativo_2', 'doce', 0.337), ('colaborativo_2', 'admi', 0.224), ('colaborativo_2', 'acud', 0.050), ('colaborativo_2', 'estu', 0.050),
('colaborativo_3', 'coor', 0.250), ('colaborativo_3', 'doce', 0.250), ('colaborativo_3', 'admi', 0.166), ('colaborativo_3', 'acud', 0.166), ('colaborativo_3', 'estu', 0.166),
-- direccion
('direccion_1', 'coor', 0.425), ('direccion_1', 'doce', 0.425), ('direccion_1', 'admi', 0.050), ('direccion_1', 'acud', 0.050), ('direccion_1', 'estu', 0.050),
('direccion_2', 'coor', 0.420), ('direccion_2', 'doce', 0.280), ('direccion_2', 'admi', 0.100), ('direccion_2', 'acud', 0.100), ('direccion_2', 'estu', 0.100),
('direccion_3', 'coor', 0.250), ('direccion_3', 'doce', 0.250), ('direccion_3', 'admi', 0.166), ('direccion_3', 'acud', 0.166), ('direccion_3', 'estu', 0.166),
-- orientacion
('orientacion_1', 'coor', 0.250), ('orientacion_1', 'doce', 0.250), ('orientacion_1', 'admi', 0.166), ('orientacion_1', 'acud', 0.166), ('orientacion_1', 'estu', 0.166),
('orientacion_2', 'coor', 0.425), ('orientacion_2', 'doce', 0.425), ('orientacion_2', 'admi', 0.050), ('orientacion_2', 'acud', 0.050), ('orientacion_2', 'estu', 0.050),
('orientacion_3', 'coor', 0.200), ('orientacion_3', 'doce', 0.200), ('orientacion_3', 'admi', 0.200), ('orientacion_3', 'acud', 0.200), ('orientacion_3', 'estu', 0.200),
-- convivencia
('convivencia_1', 'coor', 0.250), ('convivencia_1', 'doce', 0.250), ('convivencia_1', 'admi', 0.166), ('convivencia_1', 'acud', 0.166), ('convivencia_1', 'estu', 0.166),
('convivencia_2', 'coor', 0.350), ('convivencia_2', 'doce', 0.350), ('convivencia_2', 'admi', 0.100), ('convivencia_2', 'acud', 0.100), ('convivencia_2', 'estu', 0.100),
('convivencia_3', 'coor', 0.200), ('convivencia_3', 'doce', 0.200), ('convivencia_3', 'admi', 0.200), ('convivencia_3', 'acud', 0.200), ('convivencia_3', 'estu', 0.200),
-- evaluacion
('evaluacion_1', 'coor', 0.425), ('evaluacion_1', 'doce', 0.425), ('evaluacion_1', 'admi', 0.050), ('evaluacion_1', 'acud', 0.050), ('evaluacion_1', 'estu', 0.050),
('evaluacion_2', 'coor', 0.350), ('evaluacion_2', 'doce', 0.350), ('evaluacion_2', 'admi', 0.100), ('evaluacion_2', 'acud', 0.100), ('evaluacion_2', 'estu', 0.100),
('evaluacion_3', 'coor', 0.200), ('evaluacion_3', 'doce', 0.300), ('evaluacion_3', 'admi', 0.166), ('evaluacion_3', 'acud', 0.166), ('evaluacion_3', 'estu', 0.166),
-- vision
('vision_1', 'coor', 0.350), ('vision_1', 'doce', 0.350), ('vision_1', 'admi', 0.100), ('vision_1', 'acud', 0.100), ('vision_1', 'estu', 0.100),
('vision_2', 'coor', 0.425), ('vision_2', 'doce', 0.425), ('vision_2', 'admi', 0.050), ('vision_2', 'acud', 0.050), ('vision_2', 'estu', 0.050),
('vision_3', 'coor', 0.200), ('vision_3', 'doce', 0.200), ('vision_3', 'admi', 0.200), ('vision_3', 'acud', 0.200), ('vision_3', 'estu', 0.200),
-- planeacion
('planeacion_1', 'coor', 0.250), ('planeacion_1', 'doce', 0.250), ('planeacion_1', 'admi', 0.166), ('planeacion_1', 'acud', 0.166), ('planeacion_1', 'estu', 0.166),
('planeacion_2', 'coor', 0.360), ('planeacion_2', 'doce', 0.240), ('planeacion_2', 'admi', 0.200), ('planeacion_2', 'acud', 0.100), ('planeacion_2', 'estu', 0.100),
('planeacion_3', 'coor', 0.250), ('planeacion_3', 'doce', 0.250), ('planeacion_3', 'admi', 0.166), ('planeacion_3', 'acud', 0.166), ('planeacion_3', 'estu', 0.166),
-- redes
('redes_1', 'coor', 0.420), ('redes_1', 'doce', 0.280), ('redes_1', 'admi', 0.100), ('redes_1', 'acud', 0.100), ('redes_1', 'estu', 0.100),
('redes_2', 'coor', 0.350), ('redes_2', 'doce', 0.350), ('redes_2', 'admi', 0.100), ('redes_2', 'acud', 0.100), ('redes_2', 'estu', 0.100),
('redes_3', 'coor', 0.425), ('redes_3', 'doce', 0.425), ('redes_3', 'admi', 0.050), ('redes_3', 'acud', 0.050), ('redes_3', 'estu', 0.050),
-- alianzas
('alianzas_1', 'coor', 0.300), ('alianzas_1', 'doce', 0.200), ('alianzas_1', 'admi', 0.166), ('alianzas_1', 'acud', 0.166), ('alianzas_1', 'estu', 0.166),
('alianzas_2', 'coor', 0.510), ('alianzas_2', 'doce', 0.340), ('alianzas_2', 'admi', 0.050), ('alianzas_2', 'acud', 0.050), ('alianzas_2', 'estu', 0.050),
('alianzas_3', 'coor', 0.350), ('alianzas_3', 'doce', 0.350), ('alianzas_3', 'admi', 0.100), ('alianzas_3', 'acud', 0.100), ('alianzas_3', 'estu', 0.100),
-- rendicion
('rendicion_1', 'coor', 0.300), ('rendicion_1', 'doce', 0.200), ('rendicion_1', 'admi', 0.166), ('rendicion_1', 'acud', 0.166), ('rendicion_1', 'estu', 0.166),
('rendicion_2', 'coor', 0.440), ('rendicion_2', 'doce', 0.294), ('rendicion_2', 'admi', 0.166), ('rendicion_2', 'acud', 0.050), ('rendicion_2', 'estu', 0.050),
('rendicion_3', 'coor', 0.200), ('rendicion_3', 'doce', 0.200), ('rendicion_3', 'admi', 0.200), ('rendicion_3', 'acud', 0.200), ('rendicion_3', 'estu', 0.200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. ENTIDADES TERRITORIALES (34 entités)
-- ============================================================
INSERT INTO entidades_territoriales (id, nombre) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Amazonas'),
  ('e0000001-0000-0000-0000-000000000002', 'Antioquia'),
  ('e0000001-0000-0000-0000-000000000003', 'Arauca'),
  ('e0000001-0000-0000-0000-000000000004', 'Atlántico'),
  ('e0000001-0000-0000-0000-000000000005', 'Bogotá'),
  ('e0000001-0000-0000-0000-000000000006', 'Bolívar'),
  ('e0000001-0000-0000-0000-000000000007', 'Boyacá'),
  ('e0000001-0000-0000-0000-000000000008', 'Caldas'),
  ('e0000001-0000-0000-0000-000000000009', 'Caquetá'),
  ('e0000001-0000-0000-0000-000000000010', 'Casanare'),
  ('e0000001-0000-0000-0000-000000000011', 'Cauca'),
  ('e0000001-0000-0000-0000-000000000012', 'Cesar'),
  ('e0000001-0000-0000-0000-000000000013', 'Chocó'),
  ('e0000001-0000-0000-0000-000000000014', 'Córdoba'),
  ('e0000001-0000-0000-0000-000000000015', 'Cundinamarca'),
  ('e0000001-0000-0000-0000-000000000016', 'Guainía'),
  ('e0000001-0000-0000-0000-000000000017', 'Guaviare'),
  ('e0000001-0000-0000-0000-000000000018', 'Huila'),
  ('e0000001-0000-0000-0000-000000000019', 'La Guajira'),
  ('e0000001-0000-0000-0000-000000000020', 'Magdalena'),
  ('e0000001-0000-0000-0000-000000000021', 'Meta'),
  ('e0000001-0000-0000-0000-000000000022', 'Nariño'),
  ('e0000001-0000-0000-0000-000000000023', 'Norte de Santander'),
  ('e0000001-0000-0000-0000-000000000024', 'Putumayo'),
  ('e0000001-0000-0000-0000-000000000025', 'Quibdó'),
  ('e0000001-0000-0000-0000-000000000026', 'Quindío'),
  ('e0000001-0000-0000-0000-000000000027', 'Risaralda'),
  ('e0000001-0000-0000-0000-000000000028', 'San Andrés y Providencia'),
  ('e0000001-0000-0000-0000-000000000029', 'Santander'),
  ('e0000001-0000-0000-0000-000000000030', 'Sucre'),
  ('e0000001-0000-0000-0000-000000000031', 'Tolima'),
  ('e0000001-0000-0000-0000-000000000032', 'Valle del Cauca'),
  ('e0000001-0000-0000-0000-000000000033', 'Vaupés'),
  ('e0000001-0000-0000-0000-000000000034', 'Vichada')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. REGIONES (only production regions, excluding test)
-- ============================================================
INSERT INTO regiones (id, nombre, entidad_territorial_id, mostrar_logo_rlt, mostrar_logo_clt) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'Oriente', 'e0000001-0000-0000-0000-000000000002', true, true),
  ('r0000001-0000-0000-0000-000000000002', 'Quibdó', 'e0000001-0000-0000-0000-000000000025', true, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. MUNICIPIOS (for Oriente & Quibdó regions)
-- ============================================================
INSERT INTO municipios (id, nombre, entidad_territorial_id) VALUES
  ('m0000001-0000-0000-0000-000000000001', 'El Carmen de Viboral', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000002', 'El Peñol', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000003', 'El Retiro', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000004', 'El Santuario', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000005', 'Granada', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000006', 'La Ceja', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000007', 'Marinilla', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000008', 'San Carlos', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000009', 'San Luis', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000010', 'San Rafael', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000011', 'San Vicente', 'e0000001-0000-0000-0000-000000000002'),
  ('m0000001-0000-0000-0000-000000000012', 'Quibdó', 'e0000001-0000-0000-0000-000000000025')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. REGION ↔ MUNICIPIO links
-- ============================================================
INSERT INTO region_municipios (region_id, municipio_id) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000001'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000002'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000003'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000004'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000005'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000006'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000007'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000008'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000009'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000010'),
  ('r0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000011'),
  ('r0000001-0000-0000-0000-000000000002', 'm0000001-0000-0000-0000-000000000012')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. INSTITUCIONES EDUCATIVAS
-- ============================================================
-- Oriente
INSERT INTO instituciones (id, nombre, municipio_id) VALUES
  ('n0000001-0000-0000-0000-000000000001', 'Institución Educativa Ignacio Botero', 'm0000001-0000-0000-0000-000000000003'),
  ('n0000001-0000-0000-0000-000000000002', 'Institución Educativa La Paz', 'm0000001-0000-0000-0000-000000000006'),
  ('n0000001-0000-0000-0000-000000000003', 'Institución Educativa Rural Campestre Nuevo Horizonte', 'm0000001-0000-0000-0000-000000000001'),
  ('n0000001-0000-0000-0000-000000000004', 'Institución Educativa El Progreso', 'm0000001-0000-0000-0000-000000000001'),
  ('n0000001-0000-0000-0000-000000000005', 'Institución Educativa Rural Santa María', 'm0000001-0000-0000-0000-000000000001'),
  ('n0000001-0000-0000-0000-000000000006', 'Institución Educativa Rural Obispo Emilio Botero', 'm0000001-0000-0000-0000-000000000007'),
  ('n0000001-0000-0000-0000-000000000007', 'Centro Educativo Rural Monseñor Francisco Luis Gómez', 'm0000001-0000-0000-0000-000000000004'),
  ('n0000001-0000-0000-0000-000000000008', 'Centro Educativo Rural José Ignacio Botero Palacio', 'm0000001-0000-0000-0000-000000000004'),
  ('n0000001-0000-0000-0000-000000000009', 'Institución Educativa San Rafael', 'm0000001-0000-0000-0000-000000000010'),
  ('n0000001-0000-0000-0000-000000000010', 'Institución Educativa Rural Samaná', 'm0000001-0000-0000-0000-000000000008'),
  ('n0000001-0000-0000-0000-000000000011', 'Institución Educativa Rural La Josefina', 'm0000001-0000-0000-0000-000000000008'),
  ('n0000001-0000-0000-0000-000000000012', 'Institución Educativa Rural El Prodigio', 'm0000001-0000-0000-0000-000000000009'),
  ('n0000001-0000-0000-0000-000000000013', 'Centro Educativo Rural Guamito', 'm0000001-0000-0000-0000-000000000009'),
  ('n0000001-0000-0000-0000-000000000014', 'Institución Educativa San José de las Flores', 'm0000001-0000-0000-0000-000000000009'),
  ('n0000001-0000-0000-0000-000000000015', 'Institución Educativa Rural Santa Ana', 'm0000001-0000-0000-0000-000000000002'),
  ('n0000001-0000-0000-0000-000000000016', 'Institución Educativa Rural Chaparral', 'm0000001-0000-0000-0000-000000000005'),
  ('n0000001-0000-0000-0000-000000000017', 'Institución Educativa San Vicente Ferrer', 'm0000001-0000-0000-0000-000000000011'),
-- Quibdó
  ('n0000001-0000-0000-0000-000000000018', 'Centro Educativo Diego Luis Córdoba', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000019', 'Centro Educativo El Barranco', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000020', 'Centro Educativo Indígena Emberá Alfonso Dumasa de Caimanero de Jampapa', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000021', 'Centro Educativo José Antonio Velásquez del 20', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000022', 'Centro Educativo José Melanio Tunay del 21', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000023', 'Centro Educativo Munguido', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000024', 'Institución Educativa Antonio María Claret', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000025', 'Institución Educativa Armando Luna Roa', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000026', 'Institución Educativa Diocesano Pedro Grau y Arola', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000027', 'Institución Educativa Feminina de Enseñanza Media', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000028', 'Institución Educativa Gimnasio de Quibdó', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000029', 'Institución Educativa Isaac Rodríguez Martínez', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000030', 'Institución Educativa José del Carmén Cuesta Rentería', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000031', 'Institución Educativa Manuel Agustín Santacoloma Villa', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000032', 'Institución Educativa MIA Jorge Valencia', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000033', 'Institución Educativa MIA Rogerio Velásquez Murillo', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000034', 'Institución Educativa Miguel Antonio Caicedo Mena - Obapo', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000035', 'Institución Educativa Normal Superior de Quibdó', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000036', 'Institución Educativa Normal Superior Manuel Cañizales', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000037', 'Institución Educativa Santo Domingo de Guzmán', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000038', 'Institución Educativa Santo Domingo Savio', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000039', 'Institución Educativa Técnica Agroecológica Cristo Rey de Tutunendo', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000040', 'Institución Educativa Técnica Agropecuaria de Tagachi', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000041', 'Institución Educativa Técnica Antonio Ricaurte', 'm0000001-0000-0000-0000-000000000012'),
  ('n0000001-0000-0000-0000-000000000042', 'Institución Educativa Técnico Integrado Carrasquilla Industrial', 'm0000001-0000-0000-0000-000000000012')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. REGION ↔ INSTITUCIONES links
-- ============================================================
-- Oriente institutions
INSERT INTO region_instituciones (region_id, institucion_id) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000001'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000002'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000003'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000004'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000005'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000006'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000007'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000008'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000009'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000010'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000011'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000012'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000013'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000014'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000015'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000016'),
  ('r0000001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000017'),
-- Quibdó institutions
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000018'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000019'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000020'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000021'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000022'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000023'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000024'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000025'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000026'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000027'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000028'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000029'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000030'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000031'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000032'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000033'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000034'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000035'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000036'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000037'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000038'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000039'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000040'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000041'),
  ('r0000001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000042')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. APP IMAGES (paths to update after uploading to /uploads)
-- ============================================================
INSERT INTO app_images (image_key, storage_path) VALUES
  ('cover_bg', '/uploads/cover_bg.png'),
  ('lightbulb_icon', '/uploads/lightbulb_icon.png'),
  ('logo_clt', '/uploads/logo_clt.png'),
  ('logo_clt_dark', '/uploads/logo_clt_dark.png'),
  ('logo_clt_white', '/uploads/logo_clt_white.jpeg'),
  ('logo_cosmo', '/uploads/logo_cosmo.png'),
  ('logo_cosmo_white', '/uploads/logo_cosmo_white.png'),
  ('logo_rlt', '/uploads/logo_rlt.png'),
  ('logo_rlt_white', '/uploads/logo_rlt_white.jpeg')
ON CONFLICT (image_key) DO NOTHING;

COMMIT;

-- ============================================================
-- APP SETTINGS
-- ============================================================
INSERT INTO app_settings (key, value) VALUES
  ('review_modal_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- POST-SEED INSTRUCTIONS
-- ============================================================
-- 1. Change admin password immediately:
--    node -e "require('bcryptjs').hash('YOUR_NEW_PASSWORD', 12).then(console.log)"
--    UPDATE users SET password_hash = '<new_hash>' WHERE email = 'admin@cosmo.edu.co';
--
-- 2. Upload images from Supabase bucket to /uploads directory
--
-- 3. Run: psql $DATABASE_URL -f server/schema.sql && psql $DATABASE_URL -f server/seed.sql
-- ============================================================
