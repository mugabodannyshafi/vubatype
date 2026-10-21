import { BadRequestException } from '@nestjs/common';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';

const RACE_SENTENCES: Record<string, Record<WordDifficulty, readonly string[]>> = {
  en: {
    [WordDifficulty.EASY]: [
      'The sun is warm today.',
      'We walk to the market.',
      'My home is near school.',
      'The day is bright and clear.',
      'I have a small green book.',
      'You are kind to the cat.',
      'We sit on the soft mat.',
      'This is a good day.',
      'The bird sings in the tree.',
      'I drink water with my friend.',
      'We play in the open field.',
      'Mom cooks rice at home.',
      'The bus stops near the gate.',
      'I read a short story.',
      'They smile and wave hello.',
      'A dog runs across the yard.',
    ],
    [WordDifficulty.MEDIUM]: [
      'The teacher opens the window and greets the class.',
      'Children walk to school with their friends every morning.',
      'Our family eats breakfast together before the busy day.',
      'A small garden grows behind the house near the road.',
      'Please bring water and fruit when you visit the village.',
      'The market is full of people buying bread and rice.',
      'Students read a letter from their teacher about the trip.',
      'Happy children play football after school in the field.',
      'We learn about our country and the rivers that cross it.',
      'The morning light fills the classroom and the wooden desks.',
      'Friends share stories about the village and the green hills.',
      'My brother helps mother carry baskets from the market.',
    ],
    [WordDifficulty.HARD]: [
      'Practice each sentence slowly, then read it again until the rhythm feels natural.',
      "The old library keeps maps, letters, and newspapers that describe the city's early years.",
      'When the rain stopped, the students gathered outside and compared the stories they had written.',
      '"Remember," the teacher said, "accuracy matters more than speed when the passage is difficult."',
      'A careful typist checks the comma, the apostrophe, and the question mark before moving on.',
      "Yesterday's exercise asked everyone to type a paragraph about community, knowledge, and patience.",
      'If you miss a letter, go back, correct it, and continue without rushing the rest.',
      'The mountain road was narrow, but the travelers reached the village before nightfall.',
      'Children asked, "Can we finish the story tomorrow, or should we practice again today?"',
      'Building a habit takes time; short, focused sessions are better than one exhausting afternoon.',
      'The keyboard felt familiar, and each correct word moved the racer a little closer to the finish.',
      'Important details, such as quotation marks and commas, change the meaning of a written sentence.',
    ],
  },
  rw: {
    [WordDifficulty.EASY]: [
      'Abana barakinira mu kibuga.',
      'Mama arategura ifunguro.',
      'Data arimo akazi.',
      'Inka ziri mu rugo.',
      'Ejo tuzajya ku isoko.',
      'Amazi meza ari mu cupa.',
      'Izuba riraka neza.',
      'Inzu yacu ni nto.',
      'Turiga ikinyarwanda buri munsi.',
      'Inshuti zanjye ziraza ejo.',
      'Imvura iragwa vuba.',
      'Umwana ariga neza.',
      'Turi mu rugo rwacu.',
      'Uyu munsi uri mwiza.',
      'Yego ndabakunda cyane.',
      "Umusozi uri hafi y'inzu.",
    ],
    [WordDifficulty.MEDIUM]: [
      'Abanyeshuri bajya ku ishuri buri gitondo na bagenzi babo.',
      'Umuryango wacu urya ifunguro hamwe mbere yo gutangira akazi.',
      'Umwarimu arakingura idirishya maze akaramutsa abanyeshuri bose.',
      "Abana bakina umupira nyuma y'ishuri mu kibuga kiri hafi.",
      "Twiga ibyerekeye igihugu cyacu n'inzuzi zinyura muri cyo.",
      "Isoko ririmo abantu benshi bagura umuceri n'imbuto.",
      "Inshuti zisangira inkuru z'umudugudu n'imisozi y'icyatsi.",
      'Mama acuruza imboga ku isoko kandi agaruka vuba mu rugo.',
      "Data arima ibigori mu murima uri inyuma y'inzu.",
      'Turagendera mu mujyi kugira ngo turebe inshuti zacu.',
      'Abana basoma ibitabo mu nzu mbere yo kuryama.',
      'Izuba riva mu burasirazuba rikagera ku misozi yacu.',
    ],
    [WordDifficulty.HARD]: [
      'Nyamuneka andika buhoro, hanyuma usome interuro ukundi kugeza uburyohe bumeze neza.',
      'Iyo imvura ihagaze, abanyeshuri bahurira hanze baganira ku nkuru banditse.',
      'Umwarimu yavuze ati, "Ukuri ni ingenzi kurusha umuvuduko iyo interuro ikomeye."',
      "Umwanditsi mwiza asuzuma akoma, akapu, n'ikibazo mbere yo gukomeza.",
      "Imyitozo y'ejo yabazaga buri wese kwandika igika kijyanye n'umuryango, ubumenyi, n'umwete.",
      'Niba ubuze inyuguti, garuka, uyikosore, hanyuma ukomeze utihutisha ibisigaye.',
      "Umuhanda w'umusozi wari umwembwe, ariko abagenzi bageze mu mudugudu mbere y'ijoro.",
      'Abana babajije bati, "Tuzarangiza inkuru ejo, cyangwa twongere kwiga uyu munsi?"',
      "Kubaka umuco bifata igihe; imyitozo migufi kandi yibanda iruta iy'umunsi wose.",
      "Mwaramutse neza, kandi buri jambo ryanditswe neza rigeza umukinnyi hafi y'umusozo.",
      "Ibisobanuro by'ingenzi, nk'udukomo n'udukebesha, bihindura ubusobanuro bw'interuro yanditse.",
      'Inshuti zavuze ati, "Reka dukore hamwe, kuko umwete n\'ubwenge bikomeza umuco."',
    ],
  },
};

export function sentencesFor(languageCode: string, difficulty: WordDifficulty): readonly string[] {
  const language = RACE_SENTENCES[languageCode];
  const sentences = language?.[difficulty];
  if (!sentences || sentences.length === 0) {
    throw new BadRequestException(
      'No race sentences are available for this language and difficulty',
    );
  }
  return sentences;
}
