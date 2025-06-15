<?php

$wgExternalDataSources['DW_UNITAData_MetaIndic_Primary'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT indic_number, description, baseline, target, level, title
FROM meta_indic."task_primary_V"
ORDER BY primary_id ASC;
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaIndic_Outputs'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT description, baseline, target, comments, title, validated_coleader, validated_office, validated_t54
FROM meta_indic."task_output_V"
ORDER BY output_id ASC;
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaIndic_Outcomes'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT description, baseline, target, comments, title, validated_coleader, validated_office, validated_t54
FROM meta_indic."task_outcome_V"
ORDER BY outcome_id ASC;
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaIndic_Impact'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT description, baseline, target, comments, title, validated_coleader, validated_office, validated_t54
FROM meta_indic."task_impact_V"
ORDER BY impact_id ASC;
POSTGRE
];


$wgExternalDataSources['DW_UNITAData_MetaIndic_Ds'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT description, baseline, target, comments, title
FROM meta_indic."task_impact_V"
ORDER BY impact_id ASC;
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaIndicators'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT *
FROM meta_indic.indicator
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaIndicators'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT *
FROM meta_indic.indicator
POSTGRE
];

?>