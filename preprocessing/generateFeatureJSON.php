<?php
/**
 * Pulls distinct feature information from ../wals_dump
 * stores it as json objects
 */

$data = array_map(
	"str_getcsv",
	file("../wals_data/wals_dump.csv")
);

$features = array();
$firstloop = true;
foreach($data as $row) {
	//build an array to represent each feature based on the headers
	if($firstloop) {
		$firstloop = false;
		for($i = 8; $i < count($row); $i++) {
			//split on first space to get [feature_id, feature_name]
			$info = preg_split("/\s/", $row[$i], 2);
			$features[$i] = array("ID" => $info[0], "Name" => $info[1], "Enum" => array());
		}
		continue;
	}
	//populate the possible values of each feature
	for($i = 8; $i < count($row); $i++) {
		if(!empty($row[$i])) {
			//split on first space to get [value_id, value_name]
			$feature_info = preg_split("/\s/", $row[$i], 2);
			if(array_search($feature_info[1], $features[$i]["Enum"]) === false) {
				$features[$i]["Enum"][$feature_info[0]] = $feature_info[1];
			}
		}
	}
}

//put features in ID order
usort($features, function($a,$b) {
	return strnatcmp($a['ID'],$b['ID']);
});

//print in JSON format
//$output = "";
//foreach($features as $feature) {
//	$output .= "{\n\tid:\"".$feature["ID"]."\",";
//	$output .= "\n\tname:\"".$feature["Name"]."\",";
//	$output .= "\n\tenum: {";
//	foreach($feature["Enum"] as $enum) {
//		$output .= "\n\t\t\"".$enum."\",";
//	}
//	$output = rtrim($output, ",");
//	$output .= "\n\t}\n},\n";
//}
//$output = rtrim($output, ",\n");
$json = json_encode($features);
file_put_contents("../wals_data/feature_info_json",$json);
