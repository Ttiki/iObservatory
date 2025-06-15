<?php

// This file and queries were created for the January 2025 demo of UNITApedia
// This demo focuded on one selected task (Task 5.1) to demonstrate the capability and end concept of UNITApedia and its dashboards

$wgExternalDataSources['DW_UNITAData_DEMOJAN25_T126'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'strapi',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT * FROM public.t126s
ORDER BY id ASC;
POSTGRE
];
?>