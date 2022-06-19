import { deployLocker } from "../test/deploy";

async function main() {
  const locker = await deployLocker()
  console.log('Deployed locker at: ', locker.address)
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
