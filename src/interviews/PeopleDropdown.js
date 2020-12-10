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
