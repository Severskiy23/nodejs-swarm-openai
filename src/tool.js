export function convertFunctionToJsonSchema(fn) {
  const fnString = fn.toString();
  const functionName = fn.name;

  const allowedTypes = ['string', 'number', 'boolean', 'array', 'object'];

  const commentMatch = fnString.match(/\/\*\*([\s\S]*?)\*\//);
  if (!commentMatch) {
    throw new Error(`Function ${functionName} is missing a JSDoc comment.`);
  }
  const commentLines = commentMatch[1].split("\n").map(line => line.replace(/\*|\//g, "").trim()).filter(Boolean);
  
  const descriptionLine = commentLines.find(line => line.startsWith('@description'));
  if (!descriptionLine) {
    throw new Error(`Function ${functionName} is missing @description in its JSDoc comment.`);
  }
  const description = descriptionLine.replace('@description', '').trim();
  const paramLines = commentLines.filter(line => line.startsWith('@param'));
  
  const paramDescriptions = {};
  const paramTypeMap = {};
  const paramEnums = {};
  
  paramLines.forEach(paramLine => {
    const paramMatch = paramLine.match(/@param\s+\{(\w+)\}\s+(\w+)\s+-\s+(.*)/);
    if (paramMatch) {
      const [, paramType, paramName, paramDesc] = paramMatch;
      if (!paramType) {
        throw new Error(`Parameter ${paramName} in function ${functionName} is missing type information.`);
      }
      if (!allowedTypes.includes(paramType.toLowerCase())) {
        throw new Error(`Invalid type '${paramType}' for parameter ${paramName} in function ${functionName}. Allowed types are: ${allowedTypes.join(', ')}.`);
      }
      
      const enumMatch = paramDesc.match(/@enum\s+(\[.*?\])/);
      if (enumMatch) {
        try {
          paramEnums[paramName] = JSON.parse(enumMatch[1]);
          paramDescriptions[paramName] = paramDesc.replace(enumMatch[0], '').trim();
        } catch (e) {
          throw new Error(`Invalid enum format for parameter ${paramName} in function ${functionName}.`);
        }
      } else {
        paramDescriptions[paramName] = paramDesc.trim();
      }
      
      paramTypeMap[paramName] = paramType.toLowerCase();
    } else {
      throw new Error(`Invalid @param format in function ${functionName}'s JSDoc comment.`);
    }
  });

  const paramSignatureMatch = fnString.match(/\(([^)]*)\)/);
  const params = paramSignatureMatch ? paramSignatureMatch[1].split(',').map(param => param.trim()) : [];

  params.forEach(param => {
    const paramName = param.split('=')[0].trim();
    if (!paramDescriptions[paramName]) {
      throw new Error(`Parameter ${paramName} in function ${functionName} is not documented in the JSDoc comment.`);
    }
    if (!paramTypeMap[paramName]) {
      throw new Error(`Parameter ${paramName} in function ${functionName} is missing type information.`);
    }
  });

  Object.keys(paramDescriptions).forEach(paramName => {
    if (!params.some(param => param.startsWith(paramName))) {
      throw new Error(`Parameter ${paramName} is documented but not present in the function ${functionName} signature.`);
    }
  });

  const functionSchema = {
    type: "function",
    function: {
      name: functionName,
      description: description,
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  };

  params.forEach(param => {
    const [paramName, defaultValue] = param.split('=').map(p => p.trim());
    functionSchema.function.parameters.properties[paramName] = {
      type: paramTypeMap[paramName],
      description: paramDescriptions[paramName]
    };
    if (paramEnums[paramName]) {
      functionSchema.function.parameters.properties[paramName].enum = paramEnums[paramName];
    }
    if (defaultValue === undefined) {
      functionSchema.function.parameters.required.push(paramName);
    }
  });

  return functionSchema;
}


