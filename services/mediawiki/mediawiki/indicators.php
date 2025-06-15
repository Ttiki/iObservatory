<?php
$wgExternalDataSources['DW_UNITAData_Indicators_T131'] = [
    'server' => 'postgres',
    'type' => 'postgres',
    'name' => 'datamart',
    'user' => getenv('DATABASE_USERNAME'),
    'password' => getenv('DATABASE_PASSWORD'),
    'prepared'  => <<<'POSTGRE'
SELECT * FROM public."t1.3.1"
POSTGRE
];
?>