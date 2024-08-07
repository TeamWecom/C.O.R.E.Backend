-- Tabela tbl_activities
CREATE TABLE tbl_activities (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    guid VARCHAR(120) NOT NULL,
    "from" VARCHAR(120),
    name VARCHAR(120),
    date TEXT,
    status TEXT,
    prt TEXT,
    details TEXT
);

-- Tabela tbl_availability
CREATE TABLE tbl_availability (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    guid VARCHAR(120) NOT NULL,
    name VARCHAR(120),
    date TEXT,
    status TEXT,
    details TEXT
);

-- Tabela tbl_calls
CREATE TABLE tbl_calls (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    guid VARCHAR(120) NOT NULL,
    number VARCHAR(120),
    call_started TEXT,
    call_ringing TEXT,
    call_connected TEXT,
    call_ended TEXT,
    status INTEGER,
    direction VARCHAR(50)
);

-- Tabela list_buttons
CREATE TABLE list_buttons (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    button_name VARCHAR(50),
    button_prt TEXT,
    button_prt_user VARCHAR(250),
    button_user VARCHAR(50),
    button_type VARCHAR(50) NOT NULL,
    button_type_1 VARCHAR(50),
    button_type_2 VARCHAR(50),
    button_type_3 VARCHAR(50),
    button_type_4 VARCHAR(50),
    button_device VARCHAR(50),
    sensor_min_threshold TEXT,
    sensor_max_threshold TEXT,
    sensor_type TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    create_user TEXT,
    page TEXT,
    position_x TEXT,
    position_y TEXT,
    img TEXT
);

-- Tabela list_alarm_actions
CREATE TABLE list_alarm_actions (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    action_name VARCHAR(50),
    action_alarm_code VARCHAR(50),
    action_start_type VARCHAR(50),
    action_sensor_name VARCHAR(50),
    action_sensor_type VARCHAR(50),
    action_prt TEXT,
    action_user VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,
    action_device VARCHAR(50)
);

-- Tabela list_sensors_history
CREATE TABLE list_sensors_history (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    sensor_name TEXT NOT NULL,
    battery TEXT,
    co2 TEXT,
    humidity TEXT,
    temperature TEXT,
    leak TEXT,
    pir TEXT,
    light TEXT,
    tvoc TEXT,
    pressure TEXT,
    date TEXT
);

-- Tabela configs
CREATE TABLE configs (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    entry TEXT NOT NULL,
    value TEXT,
    type TEXT
);
