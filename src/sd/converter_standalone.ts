/* eslint-disable */
// @ts-nocheck
// added default export
// 1.6.4; b06f1d9

/**
 * Developer: Bashar Astifan 2023
 * Link: https://github.com/basharast
 */

//Regarding to tokens counter, I'm using 'encode' function
//This function available at 'encoders/cl100k_base.js',
//so this file must be included (check index.html). (unless you have something else)

/*****************/
/* MAIN FUNTIONS */
/*****************/
//Create instance first `var invokeaiResolver = new InvokeAIPromptResolver();`
//1- invokeaiResolver.convertAuto1111ToInvokeAI (positive, negative, options);
//2- invokeaiResolver.convertInvokeAIToAuto1111 (positive, negative, options);
//3- invokeaiResolver.calculateInvokeAITokens(positive, negative); //Require `encoders/cl100k_base.js` to be included
//Both functions (1 & 2) below returns object:
/*
    from: {
        positive: { text: , tokens: },
        negative: { text: , tokens: },
    },
    to: {
        positive: { text: , tokens: },
        negative: { text: , tokens: },
    }
*/

//Resolver options, all keys are optional, you don't have to add all of them
/*
    resolverOptions = {
        invokeaiVersion: 3,
        rawNegative: false,
        limitWeightPositive: "$1",
        limitWeightNegative: "$1",
        randomWeight: false,
        usePowValueAlways: false,
        dynamicPrompts: true
    };
*/

export default class InvokeAIPromptResolver {
  constructor() {
    //Constructor..
  }
  //Convert from automatic1111 to invokeai
  convertAuto1111ToInvokeAI = (
    inputPositive: any,
    inputNegative: any,
    resolverOptions: any = null
  ) => {
    var input = {
      positive: inputPositive,
      negative: inputNegative,
    };

    var ignoreNegativeParameters = false;
    if (typeof resolverOptions !== "undefined" && resolverOptions !== null) {
      if (
        typeof resolverOptions["rawNegative"] !== "undefined" &&
        resolverOptions["rawNegative"] !== null
      ) {
        ignoreNegativeParameters = resolverOptions["rawNegative"];
      }
    }
    this.parseResolverOptions(resolverOptions);

    var targetConversionTable = this.regexConversionTable.invokeAIRegexPatterns;
    var resolverContext = this;
    targetConversionTable.forEach(function (regexPatternItem: any) {
      var patternRecursive = regexPatternItem.recursiveCheck;
      if (patternRecursive) {
        input = resolverContext.regexValueRecursiveReplace(
          input,
          regexPatternItem,
          ignoreNegativeParameters
        );
      } else {
        input = resolverContext.regexValueReplace(
          input,
          regexPatternItem,
          ignoreNegativeParameters
        );
      }
    });

    //Include tokens to the output
    var finalOutput = this.prepareOutput(
      input,
      inputPositive,
      inputNegative,
      false
    );
    return finalOutput;
  };

  //Convert from invokeai to automatic1111
  convertInvokeAIToAuto1111 = (
    inputPositive: any,
    inputNegative: any,
    resolverOptions: any = null
  ) => {
    //It's expected to have negative values within input
    //so it's better to fetch them (if any)

    var ignoreNegativeParameters = false;
    if (typeof resolverOptions !== "undefined" && resolverOptions !== null) {
      if (
        typeof resolverOptions["rawNegative"] !== "undefined" &&
        resolverOptions["rawNegative"] !== null
      ) {
        ignoreNegativeParameters = resolverOptions["rawNegative"];
      }
    }
    this.parseResolverOptions(resolverOptions);

    if (this.invokeaiVersion < 3) {
      //Version 2 only, 3 doesn't support that
      inputNegative += this.fetchInvokeAINegatives(inputPositive);
    }

    var input: any = {
      positive: inputPositive,
      negative: inputNegative,
    };

    var targetConversionTable = this.regexConversionTable.auto1111RegexPatterns;
    var resolverContext = this;
    targetConversionTable.forEach(function (regexPatternItem: any) {
      var patternRecursive = regexPatternItem.recursiveCheck;
      if (patternRecursive) {
        input = resolverContext.regexValueRecursiveReplace(
          input,
          regexPatternItem,
          ignoreNegativeParameters
        );
      } else {
        input = resolverContext.regexValueReplace(
          input,
          regexPatternItem,
          ignoreNegativeParameters
        );
      }
    });

    //Include tokens to the output
    var finalOutput = this.prepareOutput(
      input,
      inputPositive,
      inputNegative,
      true
    );
    return finalOutput;
  };

  parseResolverOptions = (options: any) => {
    if (typeof options !== "undefined" && options !== null) {
      var requiredOptions = [
        {
          key: "invokeaiVersion",
          check: /([1-9]\d*)|([0-9]\d*)[\.](?!0\.)([0-9]\d*)+/g,
          default: 2,
        },
        {
          key: "limitWeightPositive",
          check: /([1-9]\d*)|([0-9]\d*)[\.](?!0\.)([0-9]\d*)+/g,
          default: "$1",
        },
        {
          key: "limitWeightNegative",
          check: /([1-9]\d*)|([0-9]\d*)[\.](?!0\.)([0-9]\d*)+/g,
          default: "$1",
        },
        {
          key: "randomWeight",
          check: /(true|false)/g,
          default: false,
        },
        {
          key: "usePowValueAlways",
          check: /(true|false)/g,
          default: false,
        },
        {
          key: "dynamicPrompts",
          check: /(true|false)/g,
          default: true,
        },
      ];
      var resolverContext: any = this;
      requiredOptions.forEach(function (option) {
        if (
          typeof options[option.key] !== "undefined" &&
          typeof options[option.key] !== null &&
          [...options[option.key].toString().matchAll(option.check)].length
        ) {
          resolverContext[option.key] = options[option.key];
        } else {
          resolverContext[option.key] = option.default;
        }
      });
    }
  };

  /***************/
  /* ENGINE CORE */
  /***************/
  invokeaiVersion = 2;
  defaultIncrease = 1.1; //'()'
  defaultMedium = 1.05; //'{}'
  defaultDecrease = 0.952; //'[]'
  defaultGroupWeight = 0.952;
  limitWeightPositive = "$1";
  limitWeightNegative = "$1";
  randomWeight = false;
  usePowValueAlways = false; //No '+,-' will be used, only fixed value: '{{word}}' => '(word)1.1025'
  powValuesMap = {
    "+": this.defaultIncrease,
    "-": this.defaultDecrease,
  };

  //Main prompt syntax resolver table
  //Be aware that elements order is important, don't change it
  //This table support many resolve styles:
  //1- 'outputRegex' as 'string' repacement including regex expression
  //2- 'outputRegex' as 'recursiveCheck' check more details below
  //3- 'outputRegex' as 'function (inputText, regexGroups)'
  //I made it dynamic as possible, check it below to get better understanding
  //'inputRegex' expected to be regex expression, it support multiple expressions as array []
  regexConversionTable = {
    //From auto1111 to invokeai key
    invokeAIRegexPatterns: [
      {
        //Group regex, no limited number for items
        //Supported cases:
        //1- [word1|word1|...] or [word1@weight|word1@weight|...] or [word1:weight|word1:weight|...]
        //2- {word1|word1|...} or {word1@weight|word1@weight|...} or {word1:weight|word1:weight|...} => V2 only, excluded from V3
        //3- (word1|word1|...) or (word1@weight|word1@weight|...) or (word1:weight|word1:weight|...)
        inputRegex: [
          String.raw`\[([^\]]+)\]`,
          String.raw`\{([^\}]+)\}`,
          String.raw`(?<!withLora)\(([^\)(?!\\)]+)\)`,
        ],
        //'outputRegex'->'function' style
        outputRegex: function (context: any, inputText: any, regexGroups: any) {
          for (const match of regexGroups) {
            var fullMatch = match[0];
            var innerMatch = match[1];
            //Check if internal matched value has '|',
            //afaik this usualy used in auto1111 to blend/group multiple elements
            if (innerMatch.indexOf("|") !== -1) {
              var groups = innerMatch.split("|");
              var outputElements: any = [];
              groups.forEach(function (groupItem: any) {
                var appendValue = "";
                groupItem = groupItem.trim();
                //The default weight split is ':',
                //but I checked auto111 code and someone also added support for '@' along with '{}'
                var possibleWeightSplits = ["@", ":"];
                possibleWeightSplits.forEach(function (splitItem) {
                  if (groupItem.indexOf(splitItem) !== -1) {
                    var itemData = groupItem.split(splitItem);
                    var itemText = itemData[0];
                    var itemWeight = itemData[1];
                    appendValue = `(${itemText})${itemWeight}`;
                  }
                });
                if (appendValue.length == 0) {
                  //This mean no weight specified,
                  //I used default weight to be used instead,
                  appendValue = `(${groupItem})${context.defaultGroupWeight}`;
                }
                outputElements.push(appendValue);
              });
              //Split array items using ','
              var blendText = "(" + outputElements.join(", ") + ")";
              inputText = inputText.replace(fullMatch, blendText);
            }
          }
          return inputText;
        },
        //Not sure if there is groups in negative prompts
        //but for now I use only the internal match as-is
        outputNegativeRegex: "$1",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
        v3: {
          inputRegex: function (context: any, negativeMatch = false) {
            var defaultRegex = [
              String.raw`\[([^\]]+)\]`,
              String.raw`(?<!withLora)\(([^\)(?!\\)]+)\)`,
            ];
            if (!context.dynamicPrompts) {
              //If dynamic prompts is off, then we goback to the default mode by replacing `{}`
              defaultRegex = [
                String.raw`\[([^\]]+)\]`,
                String.raw`\{([^\}]+)\}`,
                String.raw`(?<!withLora)\(([^\)(?!\\)]+)\)`,
              ];
            }
            return defaultRegex;
          },
        },
      },
      {
        //Ratio, which will cause blend in v2 because of ':'
        //this will look like simple case but it's very confusing, and could lead to weight issue if it wasn't accurate
        inputRegex: [
          String.raw`(\,\s{0,3}|^)([Aa]spect|[Rr]atio)(\s{0,3}\d{1,2}):(\d{1,2}\s{0,3})(\,|$)`,
          String.raw`(\,\s{0,3}|^)()(\s{0,3}\d{1,2}):(\d{1,2}\s{0,3})(\,|$)`,
        ],
        outputRegex: "$1$2$3\\:$4$5", //Expected matches '$1$2$3:$4$5'=> '$1$2$3\:$4$5'
        outputNegativeRegex: "$1$2$3\\:$4$5",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1$2$3\\:$4$5",
        recursiveCheck: false,
        v3: {
          //Using ':' is fine in v3
          outputRegex: "$1$2$3:$4$5",
          outputNegativeRegex: "$1$2$3:$4$5",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "$1$2$3:$4$5",
        },
      },
      {
        //Weight resolver (Optional)
        //This purely made based on test and not logic
        //weight with values such as 2 is causing bad results (mostly when it's in negative)
        //it will be forced to custom value by user
        inputRegex: [
          function (context: any, negativeMatch = false) {
            var matchRegex = String.raw`\)(\d+(?:\.\d+)?)\)`;
            return matchRegex;
          },
          function (context: any, negativeMatch = false) {
            var matchRegex = String.raw`(?<!\\)\:(\d+(?:\.\d+)?)`;
            return matchRegex;
          },
        ],
        outputRegex: function (context: any, inputText: any, regexGroups: any) {
          var limitedValue = context.limitWeightPositive;
          if (limitedValue.indexOf("$1") === -1) {
            if (limitedValue.indexOf(".") !== -1) {
              var splitData = limitedValue.split(".");
              var first = splitData[0];
              if (
                splitData.length > 1 &&
                [...splitData[1].matchAll(/\d+/g)].length
              ) {
                limitedValue = context.limitWeightPositive;
              } else {
                limitedValue = first;
              }
            }

            var limitedValueTemp = limitedValue;
            for (const match of regexGroups) {
              if (context.randomWeight) {
                var limitFloat = parseFloat(limitedValueTemp).toFixed(2);
                var randomFloat = context.getRandomFloat(0.1, limitFloat, 2);
                limitedValue = randomFloat;
              }
              var fullMatch = match[0];
              var innerMatch = match[1];
              if (
                parseFloat(parseFloat(innerMatch).toFixed(5)) < 9 &&
                parseFloat(innerMatch).toFixed(5) >
                  parseFloat(limitedValue).toFixed(5)
              ) {
                var replacement = fullMatch.replace(innerMatch, limitedValue);
                var innerMatchRegex = fullMatch;
                innerMatchRegex = innerMatchRegex.replace(
                  /\)/g,
                  String.raw`\)`
                );
                innerMatchRegex = String.raw`${innerMatchRegex}(?![\.\d])`;
                var regexExp = new RegExp(innerMatchRegex, "gm");
                inputText = inputText.replace(regexExp, replacement);
              }
            }
          }
          return inputText;
        }, //Expected matches ':$1'
        outputNegativeRegex: function (
          context: any,
          inputText: any,
          regexGroups: any
        ) {
          var limitedValue = context.limitWeightNegative;
          if (limitedValue.indexOf("$1") === -1) {
            if (limitedValue.indexOf(".") !== -1) {
              var splitData = limitedValue.split(".");
              var first = splitData[0];
              if (
                splitData.length > 1 &&
                [...splitData[1].matchAll(/\d+/g)].length
              ) {
                limitedValue = context.limitWeightNegative;
              } else {
                limitedValue = first;
              }
            }

            var limitedValueTemp = limitedValue;
            for (const match of regexGroups) {
              if (context.randomWeight) {
                var limitFloat = parseFloat(limitedValueTemp).toFixed(2);
                var randomFloat = context.getRandomFloat(0.1, limitFloat, 2);
                limitedValue = randomFloat;
              }
              var fullMatch = match[0];
              var innerMatch = match[1];
              if (
                parseFloat(parseFloat(innerMatch).toFixed(5)) < 9 &&
                parseFloat(innerMatch).toFixed(5) >
                  parseFloat(limitedValue).toFixed(5)
              ) {
                var replacement = fullMatch.replace(innerMatch, limitedValue);
                var innerMatchRegex = fullMatch;
                innerMatchRegex = innerMatchRegex.replace(
                  /\)/g,
                  String.raw`\)`
                );
                innerMatchRegex = String.raw`${innerMatchRegex}(?![\.\d])`;
                var regexExp = new RegExp(innerMatchRegex, "gm");
                inputText = inputText.replace(regexExp, replacement);
              }
            }
          }
          return inputText;
        },
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: ":$1",
        recursiveCheck: false,
      },
      {
        //Multiple words with weight resolver
        //as I understand when there are no '()' the weight must be related to the closet word: 'a cat and a dog:0.5' => '0.5' is for 'dog' only
        //when word wrapped within '()' this mean the whole word?: '(best quality:1.3)' => refer to one thing 'best quality' weight is '1.3'
        //the issue will start when we have: '(masterpiece, best quality:1.2)', this will be solved below
        inputRegex: [String.raw`(?<!withLora)\(([^\)(?!\\)]+)\)`],
        //'outputRegex'->'function' style
        outputRegex: function (context: any, inputText: any, regexGroups: any) {
          for (const match of regexGroups) {
            var fullMatch = match[0];
            var innerMatch = match[1];
            //Check if internal matched value has ','
            if (innerMatch.indexOf(",") !== -1) {
              var groups = innerMatch.split(",");
              var outputElements: any = [];
              groups.forEach(function (groupItem: any) {
                var appendValue = "";
                groupItem = groupItem.trim();
                //The default weight split is ':'
                var possibleWeightSplits = [":"];
                possibleWeightSplits.forEach(function (splitItem) {
                  //Check if split char is at start '!== 0' this shouldn't be changed
                  if (
                    groupItem.indexOf(splitItem) !== -1 &&
                    groupItem.indexOf(splitItem) !== 0
                  ) {
                    var itemData = groupItem.split(splitItem);
                    var itemText = itemData[0];
                    var itemWeight = itemData[1].trim();
                    appendValue = `(${itemText})${itemWeight}`;
                  }
                });
                if (appendValue.length == 0) {
                  //This mean no weight specified,
                  appendValue = `${groupItem}`;
                }
                outputElements.push(appendValue);
              });
              //Split array items using ','
              var finalText = "(" + outputElements.join(", ") + ")";
              inputText = inputText.replace(fullMatch, finalText);
            }
          }
          return inputText;
        },
        //Use only the internal match as-is
        outputNegativeRegex: "$1",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //Word with weight such as: '(word:weight)' thanks to 'Void2258'
        //This shouldn't get extra atention '+', because it's already limited with custom weight
        //Read: https://invoke-ai.github.io/InvokeAI/features/PROMPTS/#attention-weighting
        //Read: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#attentionemphasis
        //Read: https://github.com/invoke-ai/InvokeAI/discussions/3680#discussioncomment-6501175
        inputRegex: [
          String.raw`(?<!\s)(\s{0,5})\(([a-zA-Z\s\_\-\d]+)[\s]{0,3}\:\s{0,3}([\d\.]+)(\s{0,5})\)`,
        ],
        outputRegex: "$1($2)$3", //Expected matches '($1:$2)'=> '($1)$2'
        outputNegativeRegex: "$1($2)$3",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1$2",
        recursiveCheck: false,
      },
      {
        //Word with weight such as: '(word,:weight)'
        inputRegex: [
          String.raw`\(([^(]+)(?![\-\+\d])\,\s{0,5}\:\s{0,5}([\d\.]+)\s{0,5}\)`,
        ],
        outputRegex: "($1)$2", //Expected matches '($1,:$2)'=> '($1)$2'
        outputNegativeRegex: "($1)$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //Word with weight such as: '(word):weight'
        //TO-DO: case with '::' has very specific solution but for now it will be solved here
        //TO-DO: This mentioned in auto1111 docs as: [from::when] - removes from from the prompt after a fixed number of steps (when)
        inputRegex: [
          String.raw`(\([^(]+\))(?![\-\+\d])\s{0,5}\:\:\s{0,5}([\d\.]+)`,
          String.raw`(\([^(]+\))(?![\-\+\d])\s{0,5}\:\s{0,5}([\d\.]+)`,
        ],
        outputRegex: "$1$2", //Expected matches '$1:$2'=> '($1)$2'
        outputNegativeRegex: "$1$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //Attention without weight
        inputRegex: [
          String.raw`(?<!withLora)!#([^)(?!\\)]+)#!(?![\-\+\d])`,
          String.raw`(?<!withLora)!#(\([^)(?!\\)]+\)[\d\.]+)#!(?![\-\+\d])`,
        ],
        //'inputRegex, outputRegex'->'recursiveCheck' style
        outputRegex: "($1)@", //@ suppose to be replaced with one '+' or more based on check
        outputNegativeRegex: "($1)!", //! suppose to be replaced with one '+' or more based on check
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        //This will activate 'recursiveCheck' process from 'loopCount' value to 0
        recursiveCheck: true,
        //Replacement guide map so 'recursiveCheck' can use it while checking
        replacementsMap: {
          loopCount: 10,
          replacements: [
            //'output:bool' used to apply replacement on 'false'->'inputRegex' or 'true'->'outputRegex'
            {
              target: "!#",
              replacement: String.raw`\(`,
              powValue: false,
              output: false,
            },
            {
              target: "#!",
              replacement: String.raw`\)`,
              powValue: false,
              output: false,
            },
            {
              target: "@",
              replacement: "+",
              powValue: function (context: any) {
                return context.usePowValueAlways;
              },
              output: true,
            },
            {
              target: "!",
              replacement: "+",
              powValue: function (context: any) {
                return context.usePowValueAlways;
              },
              output: true,
            },
          ],
        },
      },
      {
        //LoRa
        inputRegex: String.raw`\<lora:(.*?):\s{0,3}([\d\.]+)\>`,
        outputRegex: "withLora($1,$2)", //Expected matches '<lora:$1:$2>'
        //I don't think there should be 'lora' in negative prompt, so it will be cleaned if detected
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
      },
      {
        //Lyco
        //If I'm not wrong this suppose to use same LoRa function 'withLora'
        inputRegex: String.raw`\<lyco:(.*?):\s{0,3}([\d\.]+)\>`,
        outputRegex: "withLora($1,$2)", //Expected matches '<lyco:$1:$2>'
        //I don't think there should be 'lyco' in negative prompt, so it will be cleaned if detected
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
      },
      {
        //Texture inversion with weight
        inputRegex: String.raw`<(?!lora|lyco)(.*?)\:([\d\.]+)>`,
        outputRegex: "$1:$2", //For v2 I think it must be without '<>' (some has '<>' but I don't know, no clear rule)
        outputNegativeRegex: "$1:$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
        v3: {
          //Using ':' and '<>' is fine in v3
          outputRegex: "<$1:$2>",
          outputNegativeRegex: "<$1:$2>",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "<$1>",
        },
      },
      {
        //Texture inversion
        inputRegex: String.raw`<(?!lora|lyco)(.*?)>`,
        outputRegex: "$1", //For v2 I think it must be without '<>' (some has '<>' but I don't know, no clear rule)
        outputNegativeRegex: "$1",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
        v3: {
          //Using '<>' is fine in v3
          outputRegex: "<$1>",
          outputNegativeRegex: "<$1>",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "<$1>",
        },
      },
      {
        //Word with weight such as: 'word:weight'
        inputRegex: [
          String.raw`(?<!\s)(\s{0,5})([a-zA-Z\_\-\d]{2,50})[\s]{0,3}\:\s{0,3}([\d\.]+)`,
        ],
        outputRegex: "$1($2)$3", //Expected matches '$1:$2'
        outputNegativeRegex: "$1($2)$3",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1$2",
        recursiveCheck: false,
      },
      {
        //This regex made for cases like [keyword]
        //Read: https://invoke-ai.github.io/InvokeAI/features/PROMPTS/#attention-weighting
        //Read: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#attentionemphasis
        inputRegex: String.raw`(?<!\[)\[([^[(?!\]]+)\](?![\-\+\d])`,
        outputRegex: `($1)${this.defaultDecrease}`,
        outputNegativeRegex: `($1)${this.defaultDecrease}`,
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //This regex made for cases like [keywords]:weight
        //TO-DO: case with '::' has very specific solution but for now it will be solved here
        //TO-DO: This mentioned in auto1111 docs as: [from::when] - removes from from the prompt after a fixed number of steps (when)
        inputRegex: [
          String.raw`(?<!\[)\[([^[(?!\]]+.*)\](?![\-\+\d])\s{0,5}\:\:\s{0,5}([\d\.]+)`,
          String.raw`(?<!\[)\[([^[(?!\]]+.*)\](?![\-\+\d])\s{0,5}\:\s{0,5}([\d\.]+)`,
        ],
        outputRegex: `(($1)${this.defaultDecrease})$2`,
        outputNegativeRegex: `(($1)${this.defaultDecrease})$2`,
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "($1)",
        recursiveCheck: false,
      },
      {
        //This regex made for cases like [keywords]
        inputRegex: String.raw`(?<!\[)\[([^[?!\]]+.*?)\](?![\-\+\d])`,
        outputRegex: `($1)${this.defaultDecrease}`,
        outputNegativeRegex: `($1)${this.defaultDecrease}`,
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //This regex made for cases like [[keyword]]
        //It will ignore 'Scenario Loader' case
        inputRegex: String.raw`!#(?!Scenario Loader)([^[?!\]]+)#!(?![\-\+\d])`,
        //'inputRegex, outputRegex'->'recursiveCheck' style
        outputRegex: "($1)@", //@ suppose to be replaced with one '-' or more based on check
        outputNegativeRegex: "($1)!", //! suppose to be replaced with one '-' or more based on check
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        //This will activate 'recursiveCheck' process from 'loopCount' value to 0
        recursiveCheck: true,
        //Replacement guide map so 'recursiveCheck' can use it while checking
        replacementsMap: {
          loopCount: 10,
          replacements: [
            //'output:bool' used to apply replacement on 'false'->'inputRegex' or 'true'->'outputRegex'
            {
              target: "!#",
              replacement: String.raw`\[`,
              powValue: false,
              output: false,
            },
            {
              target: "#!",
              replacement: String.raw`\]`,
              powValue: false,
              output: false,
            },
            {
              target: "@",
              replacement: "-",
              powValue: function (context: any) {
                return context.usePowValueAlways;
              },
              output: true,
            },
            {
              target: "!",
              replacement: "-",
              powValue: function (context: any) {
                return context.usePowValueAlways;
              },
              output: true,
            },
          ],
        },
      },
      {
        //This regex made for cases like {{keyword}}
        inputRegex: String.raw`!#([^\}]+)#!(?![\-\+\d])`,
        //'inputRegex, outputRegex'->'recursiveCheck' style
        outputRegex: "($1)@", //@ suppose to be replaced with pow value: each '{}'=>1.05
        outputNegativeRegex: "($1)!", //! suppose to be replaced with pow value: each '{}'=>1.05
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        //This will activate 'recursiveCheck' process from 'loopCount' value to 0
        recursiveCheck: true,
        //Replacement guide map so 'recursiveCheck' can use it while checking
        replacementsMap: {
          loopCount: 10,
          //No alternatives I know for this, it will be replaced by fixed pow value
          replacements: [
            //'output:bool' used to apply replacement on 'false'->'inputRegex' or 'true'->'outputRegex'
            {
              target: "!#",
              replacement: String.raw`\{`,
              powValue: false,
              output: false,
            },
            {
              target: "#!",
              replacement: String.raw`\}`,
              powValue: false,
              output: false,
            },
            {
              target: "@",
              replacement: this.defaultMedium,
              powValue: true,
              output: true,
            },
            {
              target: "!",
              replacement: this.defaultMedium,
              powValue: true,
              output: true,
            },
          ],
        },
        v3: {
          //In V3 we exclude `{word|word..etc}` this case supported with dynamic prompts
          inputRegex: function (context: any, negativeMatch = false) {
            var defaultRegex = String.raw`!#([^\}(?!\|)]+)#!(?![\-\+\d])`;
            if (!context.dynamicPrompts) {
              //If dynamic prompts is off, then we goback to the default mode by replacing `{}`
              defaultRegex = String.raw`!#([^\}]+)#!(?![\-\+\d])`;
            }
            return defaultRegex;
          },
        },
      },

      /******************/
      /* LEFTOVER CASES */
      /******************/
      {
        //This regex for leftover cases
        //so any resolved result ends with '::weight' will get fixed as below
        //TO-DO: This mentioned in auto1111 docs as: [from::when] - removes from from the prompt after a fixed number of steps (when)
        inputRegex: String.raw`(::[\d\.]+)`,
        outputRegex: "", //No idea currently, will be replace by empty string
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //so any resolved result ends with '):weight' will get fixed as below
        inputRegex: String.raw`(\):([\d\.]+))`,
        outputRegex: ")$2", //Current we remove ':', example: '(word):1.1' will become '(word)1.1'
        outputNegativeRegex: ")$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: ")$2",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //so any resolved result ends with '+:weight' will get fixed as below (very rare case)
        inputRegex: String.raw`(\+:([\d\.]+))`,
        outputRegex: "$2", //Currenly it will be replace with 'weight', example: '(word)+:1.1' will become '(word)1.1'
        outputNegativeRegex: "$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$2",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //so any resolved result ends with '\)+' will get fixed as below (very rare case)
        inputRegex: String.raw`(\\\))\+`,
        outputRegex: "$1", //Currently we remove '+', example: '..word\)+' will become '...word\)'
        outputNegativeRegex: "$1",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //so any resolved result ends with ')--:' will get fixed as below (very rare case)
        inputRegex: String.raw`(\)[\+\-]+)\:`,
        outputRegex: "$1", //Currently we remove ':', example: '..word)--:' will become '...word)--'
        outputNegativeRegex: "$1",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //so any resolved result ends with ',:weight' will get fixed as below (very rare case)
        inputRegex: String.raw`\,\s{0,3}\:[\d\.]+`,
        outputRegex: "", //Currently we remove it all
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
      },
      {
        //This regex for leftover cases
        //'scenario:' which will cause blend and break the output (V2)
        inputRegex: String.raw`scenario(?<!\\)\:`,
        outputRegex: String.raw`scenario\:`,
        outputNegativeRegex: String.raw`scenario\:`,
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: String.raw`scenario\:`,
        recursiveCheck: false,
        v3: {
          //Using ':' is fine in v3
          outputRegex: "scenario:",
          outputNegativeRegex: "scenario:",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "scenario:",
        },
      },
      {
        //This regex for leftover cases
        //':' which will cause blend and break the output (V2)
        inputRegex: String.raw`(?<!\\)\:`,
        outputRegex: ",", //It's safe to replace it with ',' for now
        outputNegativeRegex: ",",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: ",",
        recursiveCheck: false,
        v3: {
          //Using ':' is fine in v3
          outputRegex: ":",
          outputNegativeRegex: ":",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: ":",
        },
      },
      {
        //This regex for leftover cases
        //'{', this shouldn't happen unless prompt has '{' without close
        inputRegex: String.raw`(?<!\\)\{`,
        outputRegex: "",
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
        v3: {
          //Leave it as is, in V3 those used with dynamic prompts
          outputRegex: "{",
          outputNegativeRegex: "{",
          outputNegativeRawRegex: "{",
        },
      },
      {
        //This regex for leftover cases
        //'}', this shouldn't happen unless prompt has '}' without open
        inputRegex: String.raw`(?<!\\)\}`,
        outputRegex: "",
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
        v3: {
          //Leave it as is, in V3 those used with dynamic prompts
          outputRegex: "}",
          outputNegativeRegex: "}",
          outputNegativeRawRegex: "}",
        },
      },
      {
        //This regex for leftover cases, currently 'AND' will be replace with ':' which will allow to blend
        //Not sure what [AND, BREAK..etc] do, so blend maybe not the perfect solution here
        inputRegex: String.raw`(\n)\s{0,5}(AND)\s{0,5}(\n)`,
        outputRegex: "$1:$3",
        outputNegativeRegex: "$1:$3",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1$2$3",
        recursiveCheck: false,
        v3: {
          //`:` no longer work in v3 and I don't know what is the other option for now
          outputRegex: "$1$2$3",
          outputNegativeRegex: "$1$2$3",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "$1$2$3",
        },
      },
    ],
    //From invokeai to auto1111 key
    //this part should cover most basic cases, still need more tests
    auto1111RegexPatterns: [
      {
        //Invokeai negative prompt regex
        //we don't keep those in the output because negative part will be extracted alone before we start regex process
        inputRegex: String.raw`\[([^\]]+)\]`,
        outputRegex: "",
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
        v3: {
          //Keep it as is for v3
          outputRegex: "[$1]",
          outputNegativeRegex: "[$1]",
          //Negative raw will be used when user choose to ignore (attention and weight)
          outputNegativeRawRegex: "$1",
        },
      },
      {
        //LoRa
        inputRegex: String.raw`withLora\((.*?),\s{0,3}([\d\.]+)\)`,
        outputRegex: "<lora:$1:$2>", //Expected match 'withLora($1,$2)
        outputNegativeRegex: "",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "",
        recursiveCheck: false,
      },
      {
        //This regex will revert any '(word)defaultDecrease' to '[word]'
        //this case already explained above
        inputRegex: String.raw`\(([^\)]+)\)${this.defaultDecrease}`,
        outputRegex: `[$1]`,
        outputNegativeRegex: "[$1]",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //Word with weight such as '(word)0.2'
        inputRegex: String.raw`\(([^\)]+)\)([\d\.]+)`,
        outputRegex: `$1:$2`, //Expected match '($1)$2'
        outputNegativeRegex: "$1:$2",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: false,
      },
      {
        //Regex to resolve back invokeai attention syntax
        //it will match results such as: '(word)+', '(word)+++'....
        inputRegex: String.raw`\(([^)]+)\)@`,
        outputRegex: "!#$1#!",
        outputNegativeRegex: "!#$1#!",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: true,
        replacementsMap: {
          loopCount: 10,
          replacements: [
            {
              target: "@",
              replacement: String.raw`\+`,
              powValue: false,
              output: false,
            },
            { target: "!#", replacement: `(`, powValue: false, output: true },
            { target: "#!", replacement: `)`, powValue: false, output: true },
          ],
        },
      },
      {
        //Regex to resolve back invokeai decrease syntax
        //it will match results such as: '(word)-', '(word)--'....
        inputRegex: String.raw`\(([^)]+)\)!`,
        outputRegex: "!#$1#!",
        outputNegativeRegex: "!#$1#!",
        //Negative raw will be used when user choose to ignore (attention and weight)
        outputNegativeRawRegex: "$1",
        recursiveCheck: true,
        replacementsMap: {
          loopCount: 10,
          replacements: [
            { target: "!", replacement: String.raw`\-`, output: false },
            { target: "!#", replacement: `[`, powValue: false, output: true },
            { target: "#!", replacement: `]`, powValue: false, output: true },
          ],
        },
      },
    ],
  };

  /********************/
  /* SYNTAX RESOLVERS */
  /********************/
  //Recursive regex replacer
  //'ignoreNegativeParameters' will force 'patternNegativeRawOutput' usage for negative prompts
  regexValueRecursiveReplace = (
    input: any,
    regexPatternItem: any,
    ignoreNegativeParameters = false
  ) => {
    var inputPositive = input.positive;
    var inputNegative = input.negative;
    var replacementsMap = regexPatternItem.replacementsMap;
    var loopCount = replacementsMap.loopCount;
    var replacements = replacementsMap.replacements;
    var patternInput = regexPatternItem.inputRegex;
    var patternOutput = regexPatternItem.outputRegex;
    var patternNegativeOutput = regexPatternItem.outputNegativeRegex;
    var patternNegativeRawOutput = regexPatternItem.outputNegativeRawRegex;
    var resolverContext: any = this;

    for (var i = loopCount; i >= 0; i--) {
      var iterations = i;
      patternInput = regexPatternItem.inputRegex;
      patternOutput = regexPatternItem.outputRegex;
      patternNegativeOutput = regexPatternItem.outputNegativeRegex;
      patternNegativeRawOutput = regexPatternItem.outputNegativeRawRegex;

      //Check if we have custom regex for current version
      var versionKey = "v" + this.invokeaiVersion;
      if (typeof regexPatternItem[versionKey] !== "undefined") {
        if (typeof regexPatternItem[versionKey]["inputRegex"] !== "undefined") {
          patternInput = regexPatternItem[versionKey]["inputRegex"];
        }
        if (
          typeof regexPatternItem[versionKey]["outputRegex"] !== "undefined"
        ) {
          patternOutput = regexPatternItem[versionKey]["outputRegex"];
        }
        if (
          typeof regexPatternItem[versionKey]["outputNegativeRegex"] !==
          "undefined"
        ) {
          patternNegativeOutput =
            regexPatternItem[versionKey]["outputNegativeRegex"];
        }
        if (
          typeof regexPatternItem[versionKey]["outputNegativeRawRegex"] !==
          "undefined"
        ) {
          patternNegativeRawOutput =
            regexPatternItem[versionKey]["outputNegativeRawRegex"];
        }
        if (
          typeof regexPatternItem[versionKey]["replacementsMap"] !== "undefined"
        ) {
          replacementsMap = regexPatternItem[versionKey]["replacementsMap"];
          loopCount = replacementsMap.loopCount;
          replacements = replacementsMap.replacements;
        }
      }

      //Expected to be one string regex value,
      //it will be made as array with 1 element by default
      var inputRegexArray = [patternInput];
      //Check if it's array of regex values
      if (typeof patternInput === "object") {
        //Assign it as-is
        inputRegexArray = patternInput;
      } else if (typeof patternInput === "function") {
        var result = patternInput(resolverContext);
        if (typeof result === "object") {
          //Assign it as-is
          inputRegexArray = result;
        } else {
          inputRegexArray = [result];
        }
      }

      //Loop through all regex items
      inputRegexArray.forEach(function (inputRegexItem) {
        /* PREPARE REGEX EXPRESSION */
        //This will prepare 'inputRegexItem' and 'patternOutput'
        //Loop through replacements lists
        replacements.forEach(function (replacementItem: any) {
          var mapTarget = replacementItem.target;
          var mapReplacement = replacementItem.replacement;
          var mapOutput = replacementItem.output;
          var powValue =
            typeof replacementItem.powValue !== "function"
              ? replacementItem.powValue
              : replacementItem.powValue(resolverContext);
          if (iterations > 0) {
            if (powValue) {
              var numericValue = replacementItem.replacement;
              if (typeof numericValue === "string") {
                numericValue = resolverContext.powValuesMap[numericValue];
              }
              var pValue = Math.pow(numericValue, iterations + 1);
              mapReplacement = parseFloat(pValue.toFixed(4)).toString();
            } else {
              for (var j = 0; j < iterations; j++) {
                mapReplacement += replacementItem.replacement;
              }
            }
          } else {
            if (powValue) {
              var numericValue = replacementItem.replacement;
              if (typeof numericValue === "string") {
                numericValue = resolverContext.powValuesMap[numericValue];
              }
              mapReplacement = numericValue.toString();
            }
          }

          //if 'output:false' apply replacements on 'inputRegex'
          if (!mapOutput) {
            inputRegexItem = inputRegexItem.replace(mapTarget, mapReplacement);
          } else {
            //if 'output:true' apply replacements on 'outputRegex' and 'outputNegativeRegex'
            patternOutput = patternOutput.replace(mapTarget, mapReplacement);
            if (patternNegativeOutput.indexOf(mapTarget) !== -1) {
              patternNegativeOutput = patternNegativeOutput.replace(
                mapTarget,
                mapReplacement
              );
            }
          }
        });

        /* MATCH AND REPLACE */
        var matchPositive: any = null;
        var matchNegative: any = null;
        if (typeof inputRegexItem === "function") {
          matchPositive = inputRegexItem(resolverContext);
          matchNegative = inputRegexItem(resolverContext, true);
        } else {
          matchPositive = inputRegexItem;
          matchNegative = inputRegexItem;
        }
        var regexExp = new RegExp(matchPositive, "gm");
        var regexNegativeExp = new RegExp(matchNegative, "gm");

        if (
          typeof patternOutput !== "function" ||
          patternOutput.toString().indexOf("regexGroups") === -1
        ) {
          if (typeof patternOutput !== "function") {
            inputPositive = inputPositive.replace(regexExp, patternOutput);
          } else {
            inputPositive = inputPositive.replace(
              regexExp,
              patternOutput(resolverContext)
            );
          }
          if (!ignoreNegativeParameters) {
            if (typeof patternNegativeOutput !== "function") {
              inputNegative = inputNegative.replace(
                regexNegativeExp,
                patternNegativeOutput
              );
            } else {
              if (
                patternNegativeOutput.toString().indexOf("regexGroups") === -1
              ) {
                inputNegative = inputNegative.replace(
                  regexNegativeExp,
                  patternNegativeOutput(resolverContext)
                );
              } else {
                const regexNegativeGroups =
                  inputNegative.matchAll(inputRegexItem);
                inputNegative = patternNegativeOutput(
                  resolverContext,
                  inputNegative,
                  regexNegativeGroups
                );
              }
            }
          }
        } else {
          //If 'patternOutput' is function then extract matched groups and pass them to the function
          const regexGroups = inputPositive.matchAll(matchPositive);
          inputPositive = patternOutput(
            resolverContext,
            inputPositive,
            regexGroups
          );

          const regexNegativeGroups = inputNegative.matchAll(matchNegative);
          if (!ignoreNegativeParameters) {
            if (typeof patternNegativeOutput === "function") {
              if (
                patternNegativeOutput.toString().indexOf("regexGroups") === -1
              ) {
                inputNegative = inputNegative.replace(
                  regexNegativeExp,
                  patternNegativeOutput(resolverContext)
                );
              } else {
                inputNegative = patternNegativeOutput(
                  resolverContext,
                  inputNegative,
                  regexNegativeGroups
                );
              }
            } else {
              inputNegative = patternOutput(
                resolverContext,
                inputNegative,
                regexNegativeGroups
              );
            }
          }
        }

        if (ignoreNegativeParameters) {
          inputNegative = inputNegative.replace(
            regexExp,
            patternNegativeRawOutput
          );
        }
      });
    }
    var output = {
      positive: inputPositive,
      negative: inputNegative,
    };
    return output;
  };

  regexValueReplace = (
    input: any,
    regexPatternItem: any,
    ignoreNegativeParameters = false
  ) => {
    var inputPositive = input.positive;
    var inputNegative = input.negative;
    var patternInput = regexPatternItem.inputRegex;
    var patternOutput = regexPatternItem.outputRegex;
    var patternNegativeOutput = regexPatternItem.outputNegativeRegex;
    var patternNegativeRawOutput = regexPatternItem.outputNegativeRawRegex;
    var resolverContext = this;

    //Check if we have custom regex for current version
    var versionKey = "v" + this.invokeaiVersion;
    if (typeof regexPatternItem[versionKey] !== "undefined") {
      if (typeof regexPatternItem[versionKey]["inputRegex"] !== "undefined") {
        patternInput = regexPatternItem[versionKey]["inputRegex"];
      }
      if (typeof regexPatternItem[versionKey]["outputRegex"] !== "undefined") {
        patternOutput = regexPatternItem[versionKey]["outputRegex"];
      }
      if (
        typeof regexPatternItem[versionKey]["outputNegativeRegex"] !==
        "undefined"
      ) {
        patternNegativeOutput =
          regexPatternItem[versionKey]["outputNegativeRegex"];
      }
      if (
        typeof regexPatternItem[versionKey]["outputNegativeRawRegex"] !==
        "undefined"
      ) {
        patternNegativeRawOutput =
          regexPatternItem[versionKey]["outputNegativeRawRegex"];
      }
    }

    //Expected to be one string regex value,
    //it will be made as array with 1 element by default
    var inputRegexArray = [patternInput];
    //Check if it's array of regex values
    if (typeof patternInput === "object") {
      //Assign it as-is
      inputRegexArray = patternInput;
    } else if (typeof patternInput === "function") {
      var result = patternInput(resolverContext);
      if (typeof result === "object") {
        //Assign it as-is
        inputRegexArray = result;
      } else {
        inputRegexArray = [result];
      }
    }

    //Loop through all regex items
    inputRegexArray.forEach(function (inputRegexItem) {
      var matchPositive: any = null;
      var matchNegative: any = null;
      if (typeof inputRegexItem === "function") {
        matchPositive = inputRegexItem(resolverContext);
        matchNegative = inputRegexItem(resolverContext, true);
      } else {
        matchPositive = inputRegexItem;
        matchNegative = inputRegexItem;
      }
      var regexExp = new RegExp(matchPositive, "gm");
      var regexNegativeExp = new RegExp(matchNegative, "gm");

      if (
        typeof patternOutput !== "function" ||
        patternOutput.toString().indexOf("regexGroups") === -1
      ) {
        if (typeof patternOutput !== "function") {
          inputPositive = inputPositive.replace(regexExp, patternOutput);
        } else {
          inputPositive = inputPositive.replace(
            regexExp,
            patternOutput(resolverContext)
          );
        }
        if (!ignoreNegativeParameters) {
          if (typeof patternNegativeOutput !== "function") {
            inputNegative = inputNegative.replace(
              regexNegativeExp,
              patternNegativeOutput
            );
          } else {
            if (
              patternNegativeOutput.toString().indexOf("regexGroups") === -1
            ) {
              inputNegative = inputNegative.replace(
                regexNegativeExp,
                patternNegativeOutput(resolverContext)
              );
            } else {
              const regexNegativeGroups =
                inputNegative.matchAll(inputRegexItem);
              inputNegative = patternNegativeOutput(
                resolverContext,
                inputNegative,
                regexNegativeGroups
              );
            }
          }
        }
      } else {
        //If 'patternOutput' is function then extract matched groups and pass them to the function
        const regexGroups = inputPositive.matchAll(matchPositive);
        inputPositive = patternOutput(
          resolverContext,
          inputPositive,
          regexGroups
        );
        if (!ignoreNegativeParameters) {
          const regexNegativeGroups = inputNegative.matchAll(matchNegative);
          if (typeof patternNegativeOutput === "function") {
            if (
              patternNegativeOutput.toString().indexOf("regexGroups") === -1
            ) {
              inputNegative = inputNegative.replace(
                regexNegativeExp,
                patternNegativeOutput(resolverContext)
              );
            } else {
              inputNegative = patternNegativeOutput(
                resolverContext,
                inputNegative,
                regexNegativeGroups
              );
            }
          } else {
            inputNegative = patternOutput(
              resolverContext,
              inputNegative,
              regexNegativeGroups
            );
          }
        }
      }

      if (ignoreNegativeParameters) {
        inputNegative = inputNegative.replace(
          regexNegativeExp,
          patternNegativeRawOutput
        );
      }
    });

    var output = {
      positive: inputPositive,
      negative: inputNegative,
    };

    return output;
  };

  //Fetch invokeai negative prompts, returns 'string' output
  fetchInvokeAINegatives = function (inputText: any) {
    var negativeRegex = String.raw`\[([^\]]+)\]`;
    const regexGroups = inputText.matchAll(negativeRegex);
    var negativeElements: any = [];
    for (const match of regexGroups) {
      var fullMatch = match[0];
      var innerMatch = match[1];
      negativeElements.push(innerMatch);
    }
    return negativeElements.join(", ");
  };

  //Output with tokens count
  prepareOutput = (
    simpleInput: any,
    originalPositive: any,
    originalNegative: any,
    invokeAIOriginal = false
  ) => {
    var inputPositive = simpleInput.positive;
    var inputNegative = simpleInput.negative;
    var output = {
      from: {
        positive: {
          text: originalPositive,
          tokens: this.calculateTokens(originalPositive, invokeAIOriginal),
        },
        negative: {
          text: originalNegative,
          tokens: this.calculateTokens(originalNegative, invokeAIOriginal),
        },
      },
      to: {
        positive: {
          text: inputPositive,
          tokens: this.calculateTokens(inputPositive, !invokeAIOriginal),
        },
        negative: {
          text: inputNegative,
          tokens: this.calculateTokens(inputNegative, !invokeAIOriginal),
        },
      },
    };

    return output;
  };

  setLimitedWeight = (
    positive: any,
    negative: any,
    random = false,
    forcePow = false
  ) => {
    console.log(positive);
    if (
      positive !== null &&
      [...positive.matchAll(/[\d\.]+/g)].length &&
      positive > 0
    ) {
      this.limitWeightPositive = positive;
    } else {
      this.limitWeightPositive = String.raw`$1`;
    }

    if (
      negative !== null &&
      [...negative.matchAll(/[\d\.]+/g)].length &&
      negative > 0
    ) {
      this.limitWeightNegative = negative;
    } else {
      this.limitWeightNegative = String.raw`$1`;
    }
    this.randomWeight = random;
    this.usePowValueAlways = forcePow;
  };

  /******************/
  /* TOKENS COUNTER */
  /******************/
  //Get cleaned results for accurate counting
  resolveTokensValues = (inputValue: any, invokeAI = false) => {
    var resolverContext = this;
    var regexCleaner: any = this.regexConversionTable.invokeAIRegexPatterns;
    if (invokeAI) {
      regexCleaner = this.regexConversionTable.auto1111RegexPatterns;
    }
    regexCleaner.forEach(function (regexPatternItem: any) {
      //We force negative raw cleanup style even for positive input
      var output = {
        positive: "",
        negative: inputValue,
      };
      var patternRecursive = regexPatternItem.recursiveCheck;
      if (patternRecursive) {
        output = resolverContext.regexValueRecursiveReplace(
          output,
          regexPatternItem,
          true
        );
      } else {
        output = resolverContext.regexValueReplace(
          output,
          regexPatternItem,
          true
        );
      }
      inputValue = output.negative;
    });
    return inputValue;
  };

  calculateTokens = (inputValue: any, invokeAI = false) => {
    var inputTokens = 0;
    //'encode' function available at 'encoders/cl100k_base.js', check 'index.html' header include
    //If you are getting error here in `TypeScript` then you need to import `encode` function
    if (inputValue.length > 0 && typeof encode !== "undefined") {
      var cleanedInput = this.resolveTokensValues(inputValue, invokeAI);
      const inputElementEncoded = encode(cleanedInput);
      inputTokens = inputElementEncoded.length;
    }
    return inputTokens;
  };

  calculateInvokeAITokens = (inputPositive: any, inputNegative = "") => {
    //It's expected to have negative values within input
    //so it's better to fetch them (if any)
    if (this.invokeaiVersion < 3) {
      //Version 2 only, 3 doesn't support that
      inputNegative += this.fetchInvokeAINegatives(inputPositive);
    }
    //Clean input positive from any 'negative' or new lines
    var cleanupRegex = [String.raw`\[([^\]]+)\]`, String.raw`\n`];
    cleanupRegex.forEach((element) => {
      var regexExp = new RegExp(element, "gm");
      inputPositive = inputPositive.replace(regexExp, "");
    });

    //Final output
    var output = {
      positive: {
        text: inputPositive,
        tokens: this.calculateTokens(inputPositive, true),
      },
      negative: {
        text: inputNegative,
        tokens: this.calculateTokens(inputNegative, true),
      },
    };

    return output;
  };

  getRandomFloat = function (min: any, max: any, decimals: any) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
  };
}
