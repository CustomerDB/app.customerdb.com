// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// import "./style.css";

import { InstantSearch } from "react-instantsearch-dom";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";
import Avatar from "react-avatar";

import { useSearchClient } from "../search/client.js";

import { connectAutoComplete } from "react-instantsearch-dom";

const filter = createFilterOptions();

const PeopleAutocomplete = ({
  hits,
  currentRefinement,
  refine,
  onPersonChange,
  defaultRefinement,
}) => {
  const [value, setValue] = useState({ name: defaultRefinement });

  return (
    <Autocomplete
      value={value}
      onChange={(event, newValue) => {
        if (newValue && newValue.inputValue) {
          // Create a new value from the user input
          setValue(newValue.inputValue);
          onPersonChange(newValue.objectID, newValue.inputValue);
        } else if (newValue) {
          setValue(newValue.name);
          onPersonChange(newValue.objectID, newValue.name);
        } else {
          // Clear
          setValue({ name: "" });
          onPersonChange(undefined, undefined);
        }
      }}
      inputValue={currentRefinement}
      onInputChange={(event, newInputValue) => {
        refine(newInputValue);
      }}
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        // Suggest the creation of a new value
        if (params.inputValue !== "") {
          filtered.push({
            inputValue: params.inputValue,
            name: `Add "${params.inputValue}"`,
          });
        }

        return filtered;
      }}
      getOptionLabel={(option) => (option.name ? option.name : option)}
      getOptionSelected={(option, value) => option.name === value.name}
      options={hits}
      renderInput={(params) => <TextField {...params} />}
      renderOption={(option) => {
        return (
          <p>
            {!option.inputValue && (
              <Avatar
                size={30}
                name={option.name}
                round={true}
                src={option.imageURL}
              />
            )}{" "}
            {option.name}
          </p>
        );
      }}
    />
  );
};

const CustomAutocomplete = connectAutoComplete(PeopleAutocomplete);

export default function SearchDropdown(props) {
  const searchClient = useSearchClient();

  if (!searchClient) {
    return <></>;
  }

  return (
    <InstantSearch indexName={props.index} searchClient={searchClient}>
      <CustomAutocomplete
        onPersonChange={props.onChange}
        defaultRefinement={props.defaultPerson}
      />
    </InstantSearch>
  );
}
