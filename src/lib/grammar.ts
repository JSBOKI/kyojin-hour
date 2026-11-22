const PARTICLES: Record<string, string> = {
  は: "Topic marker. It sets what the sentence is about. That is often, but not always, the subject.",
  が: "Subject marker, or the marker for new information. It points at who or what is in focus.",
  を: "Object marker. It marks what the verb acts on.",
  に: "Marks a destination, a point in time, a target, or the person an action is aimed at.",
  で: "Marks the place an action happens, or the means used to do it.",
  と: "“And” between nouns, or the marker for a quote or a companion (“with”).",
  も: "“Also” or “even”. It stands where は, が, or を would have been.",
  の: "Links nouns. Often “X’s Y”, or a noun describing the noun that follows.",
  へ: "Direction of movement. The particle is written へ and read え.",
  から: "Starting point: from a place, a time, or a reason.",
  まで: "Ending point: up to a place or a time.",
  より: "“Than” in a comparison, or “from” in stiffer speech.",
  か: "Question marker, or “or” between choices.",
  ね: "Asks for agreement. Close to “right?” or “you know”.",
  よ: "Pushes the speaker’s point toward the listener.",
  わ: "Soft emphasis at the end of a sentence.",
  ぞ: "Rough emphasis. The speaker is insisting.",
  ぜ: "Casual emphasis that pulls the listener in.",
  な: "A rough “you know”, or “don’t” when it follows the dictionary form of a verb.",
  って: "Casual quotation, or “speaking of”.",
  ば: "Conditional “if”.",
  し: "Adds a reason, like “and what’s more”.",
  けど: "“But” or “although”. A trailing けど also softens a request.",
  けれど: "“But” or “although”.",
  けれども: "A longer “but”.",
  のに: "“Even though”, often with regret or complaint.",
  ので: "“Because”. A softer reason than から.",
  ながら: "“While” doing something.",
  たり: "Lists example actions: “doing things like…”.",
  など: "“And so on” or “such as”.",
  だけ: "“Only” or “just”.",
  しか: "“Nothing but”, used with a negative verb.",
  ほど: "Degree: “to the extent that” or “enough to”.",
  くらい: "Rough amount, or “so … that”.",
  ぐらい: "Rough amount, or “so … that”.",
  や: "“And” when the list is incomplete.",
};

const AUXILIARIES: Record<string, string> = {
  ない: "Negative. “Does not” or “is not”.",
  ぬ: "Stiffer or older negative. Same job as ない.",
  ん: "Contracted negative.",
  た: "Past or completed. “Did” or “has done”.",
  だ: "Plain copula: “is” or “am”.",
  です: "Polite copula: “is”.",
  ます: "Polite verb ending.",
  である: "Formal copula, common in narration.",
  たい: "“Want to” do the verb.",
  られる: "Potential “can”, or passive “is done to”. The verb decides which.",
  れる: "Potential or passive on a godan verb.",
  させる: "Causative. “Make” or “let” someone do the verb.",
  せる: "Causative on a godan verb.",
  そう: "Appearance: “looks like” or “about to”.",
  よう: "Volitional “let’s” or “I’ll”, or the noun “way”.",
  う: "Volitional on a godan verb: “let’s” or “I’ll”.",
  らしい: "“Seems” or “I hear that”.",
  すぎる: "“Too much”.",
  ください: "Makes a polite request out of a te-form.",
  下さい: "Makes a polite request out of a te-form.",
  しまう: "Completion, sometimes with regret: “ended up”.",
  ちゃう: "Contraction of てしまう. “Ended up” or “went and did”.",
  じゃ: "Contraction of では. Often “is not” when ない follows.",
  ある: "“Exists” for things, or the helper in てある / である.",
  いる: "“Exists” for people and animals, or the helper in ている (“is doing”).",
  くる: "“Come”, or a helper meaning an action is coming toward the present.",
  来る: "“Come”, or a helper meaning an action is coming toward the present.",
  いく: "“Go”, or a helper meaning an action proceeds away from now.",
  行く: "“Go”, or a helper meaning an action proceeds away from now.",
};

const CONJUGATION: Record<string, string> = {
  未然形: "Irrealis stem. This is the form used before ない, and before many passive and causative endings.",
  連用形: "Continuative stem. This is the form used before ます, and to join clauses.",
  終止形: "Plain ending. This form can close a sentence.",
  連体形: "Attributive form. This form sits in front of a noun.",
  仮定形: "Conditional stem. ば usually follows it: “if”.",
  命令形: "Command form.",
  連用テ接続: "Te-form stem. It connects to て or で: sequence, requests, or an ongoing action.",
  連用タ接続: "Ta-form stem. It connects to た or だ for the past.",
  仮定縮約: "Contracted conditional, the shape behind なら or けりゃ.",
  未然ウ接続: "Stem for the volitional: “let’s” or “I’ll”.",
  体言接続: "This form connects straight onto a noun.",
  ガル接続: "Stem used before がる, “to show signs of feeling”.",
  音便連用形: "Euphonic stem. The sound has shifted to take て or た.",
};

const POS_LABEL: Record<string, string> = {
  名詞: "noun",
  動詞: "verb",
  形容詞: "i-adjective",
  形容動詞: "na-adjective",
  副詞: "adverb",
  助詞: "particle",
  助動詞: "auxiliary",
  接続詞: "conjunction",
  感動詞: "interjection",
  連体詞: "pre-noun",
  接頭詞: "prefix",
  記号: "symbol",
  フィラー: "filler",
  その他: "other",
};

export function posLabel(pos: string): string {
  return POS_LABEL[pos] ?? pos;
}

export function grammarNote(input: {
  surface: string;
  lemma: string;
  pos: string;
  conjugation: string;
}): string | null {
  const notes: string[] = [];
  if (input.pos === "助詞") {
    notes.push(
      PARTICLES[input.surface] ??
        PARTICLES[input.lemma] ??
        "Particle. It marks how the word before it fits into the sentence.",
    );
  }
  if (input.pos === "助動詞") {
    const key = AUXILIARIES[input.lemma] ? input.lemma : input.surface;
    notes.push(
      AUXILIARIES[key] ??
        "Auxiliary ending. It changes tense, politeness, negation, or mood.",
    );
  }
  const conjugation = input.conjugation && input.conjugation !== "*" ? input.conjugation : "";
  const content = input.pos === "動詞" || input.pos === "形容詞" || input.pos === "助動詞";
  if (content && conjugation && conjugation !== "終止形" && CONJUGATION[conjugation]) {
    notes.push(CONJUGATION[conjugation]);
  }
  if (
    (input.pos === "動詞" || input.pos === "形容詞") &&
    input.lemma &&
    input.lemma !== "*" &&
    input.lemma !== input.surface
  ) {
    notes.push(`Dictionary form: ${input.lemma}.`);
  }
  return notes.length ? notes.join(" ") : null;
}
