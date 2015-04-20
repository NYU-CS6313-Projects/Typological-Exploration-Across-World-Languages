<?php
/**
 * Convenience script to quickly generate/update preprocessed data file
 */
require_once("generateFeatureJSON.php");
require_once("generateLanguageJSON.php");
require_once("generateFeatureLanguageJSON.php");

$feature_json = file_get_contents("../wals_data/feature_language_json");
$language_json = file_get_contents("../wals_data/language_data_json");

file_put_contents("../wals_data/preprocessed_data_json",$feature_json.",\n".$language_json);
