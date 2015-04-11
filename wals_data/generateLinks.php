<?php

$languages = array_map(
		"array_filter",
		array_map(
			"str_getcsv", 
			file("data_orig.csv")
		)
);

$language_data = array_shift( //TODO: Use this to map language information
			array_map(
				"str_getcsv", 
				file("lab_table.csv")
			)
);

$feature_data = array(); //TODO: Map features

$links = array();

//for each language
for($i=0; $i<count($languages); $i++) {
	//check the following languages
	for($j=$i+1; $j<count($languages); $j++) {
		//get any features in common
		$common_features = array_intersect_assoc($languages[$i],$languages[$j]);
		while(count($common_features) > 1) {
			//get the key of the first element
			reset($common_features);
			$feature1 = key($common_features);
			//remove that element
			unset($common_features[$feature1]);
			//link with remaining features
			foreach($common_features as $feature2 => $value) {
				if(!isset($links[$feature1][$feature2])) {
					$links[$feature1][$feature2] = 0;
				}
				//add to link strength for this feature pair
				$links[$feature1][$feature2]++;
			}
		}
	}
	echo "Language $i complete\n";
}

$output = "";
foreach($links as $feature => $features) {
	foreach($features as $mapped_feature => $strength) {
		$output .= "{\n\tsource:$feature,\n\ttarget:$mapped_feature,\n\tstrength:$strength\n},\n";
	}
}
$output = rtrim($output,",\n");
file_put_contents("link_json.csv",$output);
