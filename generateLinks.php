<?php

$languages = array_map(
		"array_filter",
		array_map(
			"str_getcsv", 
			file("wals_data/data_orig.csv")
		)
);

$language_data = array_shift( //TODO: Use this to map language information
			array_map(
				"str_getcsv", 
				file("wals_data/lab_table.csv")
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
			$feature1_value = $common_features[$feature1];
			//remove that element
			unset($common_features[$feature1]);
			//link with remaining features
			foreach($common_features as $feature2 => $value) {
				//note that these features are linked on these languages
				$links["$feature1,$feature2"][$i] = 1;
				$links["$feature1,$feature2"][$j] = 1;
			}
		}
	}
	echo "Language $i complete\n";
}

$output = "";
foreach($links as $features => $languages) {
	$features_array = explode(",",$features);
	$output .= "{\n\tsource:".$features_array[0].",\n\ttarget:".$features_array[1].",\n\tstrength:".count($languages)."\n},\n";
}
$output = rtrim($output,",\n");
file_put_contents("wals_data/link_json.csv",$output);
