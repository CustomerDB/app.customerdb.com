import "./style.css";

import { InstantSearch } from "react-instantsearch-dom";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

import { useSearchClient } from "./client.js";

import { connectAutoComplete } from "react-instantsearch-dom";

const filter = createFilterOptions();

const PeopleAutocomplete = ({
  hits,
  currentRefinement,
  refine,
  onPersonChange,
}) => {
  const [value, setValue] = useState();

  return (
    <Autocomplete
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue.name);

        if (newValue && newValue.inputValue) {
          // Create a new value from the user input
          onPersonChange(newValue.objectID, newValue.inputValue);
        } else if (newValue) {
          onPersonChange(newValue.objectID, newValue.name);
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
      getOptionLabel={(option) => option.name}
      getOptionSelected={(option, value) => option.name === value.name}
      options={hits}
      style={{ width: 300 }}
      renderInput={(params) => (
        <TextField {...params} label="Customer" variant="outlined" />
      )}
      renderOption={(option) => {
        return option.name;
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
      <CustomAutocomplete onPersonChange={props.onChange} />
    </InstantSearch>
  );
}
