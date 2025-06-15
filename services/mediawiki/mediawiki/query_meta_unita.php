<?php

$wgExternalDataSources['DW_UNITAData_MetaUNITA_Deliverables'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT deliverable_number, description, abstract, title 
FROM meta_unita."task_deliverable_V"
ORDER BY deliverable_id ASC;
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaUNITA_Activities'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT *
FROM meta_unita.activity
POSTGRE
];

$wgExternalDataSources['DW_UNITAData_MetaUNITA_Open_Project'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'unita-data',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT *
FROM meta_unita.open_project
POSTGRE
];
?>