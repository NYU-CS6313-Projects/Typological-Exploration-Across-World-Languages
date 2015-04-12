<?php
/**
 * Combines wals_dump and lab_table (from the original matlab file)
 * and massages data to produce a friendlier to work work csv
 * for language information
 */

$languages = array_map(
	"str_getcsv",
	file("wals_data/wals_dump.csv")
);

$subfam_set = array_map(
	"str_getcsv",
	file("wals_data/lab_table.csv")
);

//extract subfamilies from lab_table
$subfamily_by_iso = array();
foreach($subfam_set as $lang) {
	$subfamily_by_iso[$lang[6]] = $lang[3];
}

$output = "wals_code,iso_code,glottocode,name,lat,lon,genus,family,subfamily\n";

$count = 1;
$firstloop = true;
//organize data about each language
foreach($languages as $language) {
	if($firstloop) {
		$firstloop = false;
		continue;
	}
	$output .= $language[0];
	$output .= ",";
	//deal with the weird iso_code business going on in lab_table
	if(empty($language[1])) {
		$iso_code = str_pad($count, 3, "_", STR_PAD_LEFT);
		if(!isset($subfamily_by_iso["'$iso_code'"])) {
			$iso_code = NULL;
		}
		$count++;
	} else {
		$iso_code = $language[1];
	}
	$output .= $iso_code;
	$output .= ",";
	$output .= $language[2];
	$output .= ",";
	$output .= $language[3];
	$output .= ",";
	$output .= $language[4];
	$output .= ",";
	$output .= $language[5];
	$output .= ",";
	$output .= $language[6];
	$output .= ",";
	$output .= $language[7];
	$output .= ",";
	if(isset($subfamily_by_iso["'$iso_code'"])) {
		$output .= $subfamily_by_iso["'$iso_code'"];
	} else {
		echo "Could not match iso code for ".$language[3]."\n";
		$output .= "__";
	}
	$output .= "\n";
}

file_put_contents("wals_data/better_languages",$output);
